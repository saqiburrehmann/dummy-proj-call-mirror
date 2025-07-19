import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Contact } from '../../contact/entities/contact.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column()
  phone: string;

  @Column({ select: false })
  @Exclude()
  password: string;

  @Column({ default: false })
  isOnline: boolean;

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @Column({ nullable: true, select: false })
  @Exclude()
  refreshToken?: string;

  @Column({ nullable: true, select: false })
  @Exclude()
  token?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @VersionColumn()
  version: number;

  @OneToMany(() => Contact, (contact) => contact.owner, { eager: true })
  contacts: Contact[];

  @OneToMany(() => Contact, (contact) => contact.contactUser)
  contactOf: Contact[];
}
