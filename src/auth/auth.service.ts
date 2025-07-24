import {
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from 'src/redis/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async validateUser(email: string, password: string) {
    try {
      const user = await this.userService.findByEmailWithPassword(email);
      if (!user || !user.password) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return user;
    } catch (error) {
      this.logger.error(`Error validating user: ${error.message}`, error.stack);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('User validation failed');
    }
  }

  async loginUser(email: string, password: string) {
    try {
      const user = await this.validateUser(email, password);
      const payload = {
        sub: user.id,
        email: user.email,
        fullName: user.fullName,
      };

      // Short-lived access token (30s)
      const accessToken = this.jwtService.sign(payload, { expiresIn: '1d' });

      await this.redisService.set(
        `access-token:${user.id}`,
        accessToken,
        60 * 60 * 24,
      );

      // Long-lived refresh token (7 days)
      const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      this.logger.debug(
        `Generated refresh token for user ${user.id}: ${refreshToken}`,
      );

      // Store refresh token in Redis for 7 days
      await this.redisService.set(
        `refresh-token:${user.id}`,
        refreshToken,
        60 * 60 * 24 * 7, // 7 days
      );

      this.logger.debug(`Stored refresh-token:${user.id} in Redis`);

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
      };
    } catch (error) {
      this.logger.error(
        `Login error for email ${email}: ${error.message}`,
        error.stack,
      );
      throw new UnauthorizedException('Login failed');
    }
  }

  async refreshTokens(oldRefreshToken: string) {
    try {
      this.logger.debug(`Refreshing with token: ${oldRefreshToken}`);

      const payload = this.jwtService.verify(oldRefreshToken);
      const userId = payload?.sub;

      if (!userId) {
        throw new UnauthorizedException('Invalid refresh token (no sub)');
      }

      const storedToken = await this.redisService.get<string>(
        `refresh-token:${userId}`,
      );

      this.logger.debug(`Stored token for user ${userId}: ${storedToken}`);

      if (!storedToken || storedToken !== oldRefreshToken) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      const newAccessToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          fullName: payload.fullName,
        },
        { expiresIn: '1d' }, // 🔁 New short-lived access token
      );

      const newRefreshToken = this.jwtService.sign(
        {
          sub: payload.sub,
          email: payload.email,
          fullName: payload.fullName,
        },
        { expiresIn: '7d' }, // 🔁 New refresh token
      );

      await this.redisService.set(
        `refresh-token:${userId}`,
        newRefreshToken,
        60 * 60 * 24 * 7,
      );

      this.logger.debug(`Updated refresh token in Redis for user ${userId}`);

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error.message}`, error.stack);

      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expired');
      }

      if (error instanceof UnauthorizedException) throw error;

      throw new InternalServerErrorException('Could not refresh token');
    }
  }

  async getCurrentUser(user: any) {
    try {
      if (!user?.userId || !user?.email) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      return {
        id: user.userId,
        email: user.email,
        fullName: user.fullName,
      };
    } catch (error) {
      this.logger.warn(`Invalid token payload: ${JSON.stringify(user)}`);
      throw error;
    }
  }

  async logout(userId: string) {
    try {
      await this.redisService.del(`access-token:${userId}`);
      await this.redisService.del(`refresh-token:${userId}`);
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(
        `Logout failed for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Logout failed');
    }
  }

  async validateUserByToken(token: string) {
    try {
      const payload = this.jwtService.decode(token) as any;
      const userId = payload?.sub;
      if (!userId) throw new UnauthorizedException('Invalid token');

      // const redisToken = await this.redisService.get<string>(
      //   `access-token:${userId}`,
      // );

      // if (!redisToken || redisToken !== token) {
      //   throw new UnauthorizedException('Token expired or invalid');
      // }

      return this.userService.findOne(userId);
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      throw error instanceof UnauthorizedException
        ? error
        : new InternalServerErrorException('Token validation failed');
    }
  }
}
