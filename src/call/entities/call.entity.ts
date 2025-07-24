import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';

@Entity()
export class Call {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  caller: User;

  @ManyToOne(() => User)
  receiver: User;

  @Column()
  status: 'missed' | 'completed' | 'rejected';

  @Column({ nullable: true })
  duration?: number;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  endedAt?: Date;
}
