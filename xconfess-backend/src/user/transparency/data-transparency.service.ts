import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DataCategory,
  RetentionPolicy,
  AccountCategorySummary,
  TransparencyPanelReport,
} from './data-transparency.types';

export const AUTHORITATIVE_RETENTION_POLICIES: Record<DataCategory, RetentionPolicy> = {
  ACCOUNT_PROFILE: {
    category: 'ACCOUNT_PROFILE',
    name: 'Account & Identity Profile',
    description: 'Basic user account information including username, avatar, and authentication credentials.',
    legalBasis: 'CONTRACT',
    retentionPeriod: 'Duration of active account + 30 days grace period upon deletion request',
    autoPurgeDays: 30,
    userControllable: true,
    exportable: true,
    erasureSupport: true,
  },
  POSTS_AND_CONFESSIONS: {
    category: 'POSTS_AND_CONFESSIONS',
    name: 'Published Confessions & Responses',
    description: 'Confessions, comments, and public interactions authored by the user.',
    legalBasis: 'CONTRACT',
    retentionPeriod: 'Until user deletion or permanent erasure request',
    autoPurgeDays: null,
    userControllable: true,
    exportable: true,
    erasureSupport: true,
  },
  ENGAGEMENT_ANALYTICS: {
    category: 'ENGAGEMENT_ANALYTICS',
    name: 'Telemetry & Behavioral Analytics',
    description: 'Interaction patterns, feature clicks, and view metrics used to improve the service.',
    legalBasis: 'CONSENT',
    retentionPeriod: '90 days sliding window or until consent withdrawal',
    autoPurgeDays: 90,
    userControllable: true,
    exportable: true,
    erasureSupport: true,
  },
  SESSION_LOGS: {
    category: 'SESSION_LOGS',
    name: 'Security & Session Logs',
    description: 'IP access logs, login timestamps, device fingerprints, and security telemetry.',
    legalBasis: 'LEGITIMATE_INTEREST',
    retentionPeriod: '30 days rolling retention for abuse detection',
    autoPurgeDays: 30,
    userControllable: false,
    exportable: false,
    erasureSupport: false,
  },
  COMMUNICATION_PREFERENCES: {
    category: 'COMMUNICATION_PREFERENCES',
    name: 'Notifications & Consents',
    description: 'User notification subscriptions, marketing consent settings, and digest configs.',
    legalBasis: 'CONSENT',
    retentionPeriod: 'Duration of active account, updateable at any time',
    autoPurgeDays: null,
    userControllable: true,
    exportable: true,
    erasureSupport: true,
  },
  AUDIT_TRAILS: {
    category: 'AUDIT_TRAILS',
    name: 'Compliance & Legal Records',
    description: 'Records of data export requests, consent changes, and regulatory compliance proofs.',
    legalBasis: 'LEGAL_OBLIGATION',
    retentionPeriod: '7 years in accordance with legal and financial auditing standards',
    autoPurgeDays: 2555,
    userControllable: false,
    exportable: true,
    erasureSupport: false,
  },
};

@Injectable()
export class DataTransparencyService {
  private readonly policyVersion = '2026.11-v1';

  /**
   * Retrieves transparency panel report for a specific user based on authoritative metadata
   */
  async getTransparencyPanel(userId: string): Promise<TransparencyPanelReport> {
    if (!userId || userId.trim() === '') {
      throw new NotFoundException('User identity must be provided to retrieve data-use panel');
    }

    // In a full environment, this aggregates counts across database repositories
    const categorySummaries: AccountCategorySummary[] = (
      Object.keys(AUTHORITATIVE_RETENTION_POLICIES) as DataCategory[]
    ).map((cat) => {
      const policy = AUTHORITATIVE_RETENTION_POLICIES[cat];
      return {
        category: cat,
        name: policy.name,
        description: policy.description,
        policy,
        recordCount: this.getSimulatedCategoryCount(cat, userId),
        lastActivityAt: new Date().toISOString(),
        status: 'ACTIVE',
        availableControls: this.getControlsForCategory(cat, policy),
      };
    });

    return {
      userId,
      generatedAt: new Date().toISOString(),
      policyVersion: this.policyVersion,
      categories: categorySummaries,
      overallRetentionSummary:
        'All data is held in strict compliance with GDPR and applicable privacy frameworks. Consent-based data is purgable on-demand.',
      exportAvailable: true,
    };
  }

  private getControlsForCategory(cat: DataCategory, policy: RetentionPolicy): string[] {
    const controls: string[] = [];
    if (policy.exportable) controls.push('EXPORT');
    if (policy.erasureSupport) controls.push('DELETE');
    if (policy.userControllable) controls.push('UPDATE_PREFERENCES');
    return controls;
  }

  private getSimulatedCategoryCount(cat: DataCategory, _userId: string): number {
    switch (cat) {
      case 'ACCOUNT_PROFILE':
        return 1;
      case 'POSTS_AND_CONFESSIONS':
        return 5;
      case 'ENGAGEMENT_ANALYTICS':
        return 42;
      case 'SESSION_LOGS':
        return 12;
      case 'COMMUNICATION_PREFERENCES':
        return 3;
      case 'AUDIT_TRAILS':
        return 2;
      default:
        return 0;
    }
  }
}
