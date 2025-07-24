import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity('notification_subscriptions')
export class NotificationSubscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'simple-json' })
  subscription: any;

  @ManyToOne(() => User, (user) => user.subscriptions, { onDelete: 'CASCADE' })
  user: User;
}
