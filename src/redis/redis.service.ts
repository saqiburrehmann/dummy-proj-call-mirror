import { Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly client: Redis) {}

  async set(key: string, value: any, ttlInSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlInSeconds) {
      await this.client.set(key, serialized, 'EX', ttlInSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  getClient(): Redis {
    return this.client;
  }
}
