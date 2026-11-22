import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('analytics_consent_records')
@Index(['userId', 'policyVersion'], { unique: true })
export class AnalyticsConsentRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'integer' })
  @Index()
  userId: number;

  @Column({ name: 'policy_version', type: 'varchar', length: 64 })
  policyVersion: string;

  @Column({ name: 'consent_given', type: 'boolean', default: false })
  consentGiven: boolean;

  @Column({ name: 'withdrawn_at', type: 'timestamptz', nullable: true })
  withdrawnAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
