import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from './entities/call.entity';
import { CreateCallDto } from './dto/create-call.dto';
import { User } from 'src/user/entities/user.entity';

@Injectable()
export class CallService {
  constructor(
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserCall(userId: string) {
    return this.callRepository.find({
      where: [{ caller: { id: userId } }, { receiver: { id: userId } }],
      relations: ['caller', 'receiver'],
      order: { startedAt: 'DESC' },
    });
  }

  async createCall(dto: CreateCallDto) {
    const call = this.callRepository.create({
      caller: { id: dto.callerId },
      receiver: { id: dto.receiverId },
      status: dto.status,
      duration: dto.duration,
    });

    return this.callRepository.save(call);
  }
}
