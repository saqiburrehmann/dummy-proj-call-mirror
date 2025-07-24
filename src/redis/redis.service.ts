import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private publisher: Redis;
  private subscriber: Redis;

  constructor(@InjectRedis() private readonly client: Redis) {
    this.publisher = client.duplicate();
    this.subscriber = client.duplicate();

    this.publisher.connect().catch(console.error);
    this.subscriber.connect().catch(console.error);
  }

  getClient(): Redis {
    return this.client;
  }

  getPublisher(): Redis {
    return this.publisher;
  }

  getSubscriber(): Redis {
    return this.subscriber;
  }

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

  async onModuleDestroy() {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }
}
