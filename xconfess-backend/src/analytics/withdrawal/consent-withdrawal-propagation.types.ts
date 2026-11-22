export type WithdrawalStageName =
  | 'INGESTION_BLOCKLIST_REGISTRATION'
  | 'QUEUED_EVENTS_PURGE'
  | 'HISTORICAL_TELEMETRY_ANONYMIZATION'
  | 'DERIVED_AGGREGATE_TOMBSTONING';

export interface WithdrawalStageResult {
  stage: WithdrawalStageName;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';
  recordsAffected: number;
  message: string;
  completedAt: string | null;
}

export type ConsentWithdrawalStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface ConsentWithdrawalAuditRecord {
  withdrawalId: string;
  userId: string;
  reason?: string;
  status: ConsentWithdrawalStatus;
  requestedAt: string;
  completedAt: string | null;
  accountPreserved: boolean;
  stages: WithdrawalStageResult[];
  error?: string;
}
