import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserResponseDto } from 'src/user/dto/response.-user.dto';
import { UserService } from 'src/user/user.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  /**
   * Register a new user
   * - Accepts user credentials and creates a new user in DB
   * - Public endpoint
   */
  @Post('signup')
  @ApiOperation({ summary: 'Register new user' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  async signup(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.userService.create(createUserDto);
    } catch (error) {
      this.logger.error(`Signup failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('User registration failed');
    }
  }

  /**
   * Log in an existing user
   * - Validates credentials
   * - Sets access token in HttpOnly cookie
   * - Returns refresh token and user data
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user and set HttpOnly access token cookie' })
  @ApiBody({ type: LoginAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        refresh_token: 'JWT_REFRESH_TOKEN',
        user: {
          id: 'user-uuid',
          email: 'user@example.com',
          fullName: 'User Full Name',
        },
      },
    },
  })
  async login(
    @Body() dto: LoginAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const { access_token, refresh_token, user } =
        await this.authService.loginUser(dto.email, dto.password);

      res.cookie('token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 1000 * 60 * 15,
      });

      return { access_token, refresh_token, user };
    } catch (error) {
      this.logger.warn(`Login failed for ${dto.email}: ${error.message}`);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Login failed');
    }
  }

  /**
   * Get current authenticated user's profile
   * - Requires valid JWT (access token)
   * - Used to fetch user info in client apps
   */
  @UseGuards(JwtAuthGuard)
  @Post('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user info' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user info',
    schema: {
      example: {
        id: 'user-uuid',
        email: 'user@example.com',
        fullName: 'user fullName',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async me(@Req() req: Request) {
    try {
      const user = req.user as any;
      return await this.authService.getCurrentUser(user);
    } catch (error) {
      this.logger.warn(`Fetching current user failed: ${error.message}`);
      throw error instanceof UnauthorizedException
        ? error
        : new InternalServerErrorException('Failed to fetch current user');
    }
  }

  /**
   * Refresh JWT access and refresh tokens
   * - Accepts a valid refresh token
   * - Returns new access and refresh tokens
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        access_token: 'NEW_JWT_ACCESS_TOKEN',
        refresh_token: 'NEW_JWT_REFRESH_TOKEN',
      },
    },
  })
  async refresh(@Body() dto: RefreshTokenDto) {
    try {
      this.logger.debug(
        `Controller received refresh token: ${dto.refresh_token}`,
      );
      return await this.authService.refreshTokens(dto.refresh_token);
    } catch (error) {
      this.logger.warn(`Token refresh failed: ${error.message}`);
      if (error instanceof UnauthorizedException) throw error;
      throw new InternalServerErrorException('Token refresh failed');
    }
  }

  /**
   * Logout the user
   * - Clears access token cookie
   * - Removes tokens from Redis
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user (invalidate tokens)' })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const user = req.user as any;

      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return await this.authService.logout(user.userId);
    } catch (error) {
      this.logger.error(`Logout failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Logout failed');
    }
  }
}
