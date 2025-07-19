import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from './dto/response.-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async create(user: CreateUserDto): Promise<UserResponseDto> {
    try {
      if (user.password !== user.confirmPassword) {
        throw new ConflictException('Passwords do not match.');
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      const { confirmPassword, ...userData } = user;

      const newUser = this.userRepo.create({
        ...userData,
        password: hashedPassword,
      });

      const savedUser = await this.userRepo.save(newUser);

      return plainToInstance(UserResponseDto, savedUser, {
        excludeExtraneousValues: true,
      });
    } catch (error: any) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      if (error?.code === 'ER_DUP_ENTRY' || error?.code === '23505') {
        throw new ConflictException('Email already exists.');
      }

      console.error('User creation error:', error);
      throw new InternalServerErrorException('Failed to create user.');
    }
  }

  async findAll(page = 1, limit = 10, search = ''): Promise<UserResponseDto[]> {
    try {
      const [users] = await this.userRepo.findAndCount({
        where: search ? { email: ILike(`%${search}%`) } : {},
        skip: (page - 1) * limit,
        take: limit,
        order: { createdAt: 'DESC' },
        withDeleted: false,
      });

      return users.map((user) =>
        plainToInstance(UserResponseDto, user, {
          excludeExtraneousValues: true,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to fetch users.');
    }
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['contacts', 'contacts.contactUser'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found.`);
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({ where: { email } });
    } catch {
      return null;
    }
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      select: ['id', 'email', 'password', 'refreshToken', 'fullName'],
    });
  }

  async findOneByToken(token: string): Promise<User | null> {
    try {
      return await this.userRepo.findOne({ where: { token } });
    } catch {
      return null;
    }
  }

  async update(
    id: string,
    updatedUser: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      if (updatedUser.password) {
        updatedUser.password = await bcrypt.hash(updatedUser.password, 10);
      }

      const user = await this.userRepo.preload({ id, ...updatedUser });
      if (!user) throw new NotFoundException(`User with ID ${id} not found.`);

      const saved = await this.userRepo.save(user);
      return plainToInstance(UserResponseDto, saved, {
        excludeExtraneousValues: true,
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to update user.');
    }
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { id } });

    if (!user) throw new NotFoundException(`User with ID ${id} not found.`);

    await this.userRepo.softDelete({ id });

    return { message: `User with ID ${id} has been successfully deleted.` };
  }
}
