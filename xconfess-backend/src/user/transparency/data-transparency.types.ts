export type DataCategory =
  | 'ACCOUNT_PROFILE'
  | 'POSTS_AND_CONFESSIONS'
  | 'ENGAGEMENT_ANALYTICS'
  | 'SESSION_LOGS'
  | 'COMMUNICATION_PREFERENCES'
  | 'AUDIT_TRAILS';

export interface RetentionPolicy {
  category: DataCategory;
  name: string;
  description: string;
  legalBasis: 'CONSENT' | 'CONTRACT' | 'LEGITIMATE_INTEREST' | 'LEGAL_OBLIGATION';
  retentionPeriod: string;
  autoPurgeDays: number | null;
  userControllable: boolean;
  exportable: boolean;
  erasureSupport: boolean;
}

export interface AccountCategorySummary {
  category: DataCategory;
  name: string;
  description: string;
  policy: RetentionPolicy;
  recordCount: number;
  lastActivityAt: string | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'SCHEDULED_FOR_PURGE' | 'RESTRICTED';
  availableControls: string[];
}

export interface TransparencyPanelReport {
  userId: string;
  generatedAt: string;
  policyVersion: string;
  categories: AccountCategorySummary[];
  overallRetentionSummary: string;
  exportAvailable: boolean;
}
