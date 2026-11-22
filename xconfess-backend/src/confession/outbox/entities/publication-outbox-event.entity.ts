import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum PublicationEventType {
  PUBLICATION_SCHEDULED = 'PUBLICATION_SCHEDULED',
  PUBLICATION_PUBLISHED = 'PUBLICATION_PUBLISHED',
  PUBLICATION_CANCELLED = 'PUBLICATION_CANCELLED',
}

export enum PublicationOutboxStatus {
  PENDING = 'PENDING',
  DELIVERED = 'DELIVERED',
  DEAD_LETTER = 'DEAD_LETTER',
}

@Entity('publication_outbox_events')
@Index(['status', 'createdAt'])
export class PublicationOutboxEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'confession_id', type: 'uuid' })
  @Index()
  confessionId: string;

  @Column({
    type: 'enum',
    enum: PublicationEventType,
  })
  eventType: PublicationEventType;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({
    type: 'enum',
    enum: PublicationOutboxStatus,
    default: PublicationOutboxStatus.PENDING,
  })
  status: PublicationOutboxStatus;

  @Column({ name: 'checkpoint_seq', type: 'bigint', default: 0 })
  checkpointSeq: number;

  @Column({ type: 'integer', default: 0 })
  attempts: number;

  @Column({ name: 'max_attempts', type: 'integer', default: 5 })
  maxAttempts: number;

  @Column({ name: 'dedup_key', type: 'varchar', length: 128, unique: true })
  @Index()
  dedupKey: string;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;
}
