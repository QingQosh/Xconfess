import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';

@Entity('user_collections')
export class UserCollection {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'display_order', type: 'integer', default: 0 })
  @Index()
  displayOrder: number;

  @Column({ name: 'is_private', type: 'boolean', default: true })
  isPrivate: boolean;

  @VersionColumn({ default: 1 })
  version: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
