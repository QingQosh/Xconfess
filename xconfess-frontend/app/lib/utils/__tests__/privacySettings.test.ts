import {
  appendPrivacySettingsHistory,
  clearPrivacySettingsHistory,
  createPrivacySettingsHistoryEntry,
  diffPrivacySettings,
  loadPrivacySettingsHistory,
  mergePrivacySettingsAfterConflict,
  type PrivacySettings,
} from '@/app/lib/utils/privacySettings';
import { getTopicInclusionRules } from '@/app/lib/utils/topicInclusionRules';
import {
  computeOptInPublicPromptResults,
  createAnonymousPromptSubmission,
  DEFAULT_ANONYMOUS_PROMPT,
} from '@/app/lib/utils/anonymousPrompts';

describe('mergePrivacySettingsAfterConflict', () => {
  it('preserves user-edited fields and adopts untouched authoritative fields', () => {
    const baseline: PrivacySettings = {
      isDiscoverable: true,
      canReceiveReplies: true,
      showReactions: true,
      dataProcessingConsent: false,
    };
    const submitted: PrivacySettings = {
      ...baseline,
      isDiscoverable: false,
    };
    const server: PrivacySettings = {
      ...baseline,
      canReceiveReplies: false,
      showReactions: false,
    };

    expect(mergePrivacySettingsAfterConflict(submitted, baseline, server)).toEqual({
      isDiscoverable: false,
      canReceiveReplies: false,
      showReactions: false,
      dataProcessingConsent: false,
    });
  });
});

describe('privacySettings change history (#360)', () => {
  const initial: PrivacySettings = {
    isDiscoverable: true,
    canReceiveReplies: true,
    showReactions: true,
    dataProcessingConsent: false,
  };

  beforeEach(() => {
    clearPrivacySettingsHistory();
  });

  it('computes field transitions and records user-visible change history entries', () => {
    const updated: PrivacySettings = {
      ...initial,
      isDiscoverable: false,
      dataProcessingConsent: true,
    };

    const diffs = diffPrivacySettings(initial, updated);
    expect(diffs).toEqual([
      {
        key: 'isDiscoverable',
        label: 'Profile Discovery',
        from: true,
        to: false,
      },
      {
        key: 'dataProcessingConsent',
        label: 'Data Processing Consent',
        from: false,
        to: true,
      },
    ]);

    const entry = createPrivacySettingsHistoryEntry(
      initial,
      updated,
      '2026-03-30T10:00:00.000Z',
    );
    expect(entry).not.toBeNull();
    expect(entry?.summary).toContain('Profile Discovery: ON → OFF');
    expect(entry?.summary).toContain('Data Processing Consent: OFF → ON');

    const stored = appendPrivacySettingsHistory(
      initial,
      updated,
      '2026-03-30T10:00:00.000Z',
    );
    expect(stored).toHaveLength(1);
    expect(loadPrivacySettingsHistory()).toHaveLength(1);
  });
});

describe('public topic inclusion rules (#359)', () => {
  it('returns structured moderation, privacy, threshold, and ranking rules for the active topic window', () => {
    const rules = getTopicInclusionRules('7days', 'relationships');
    expect(rules).toHaveLength(4);
    expect(rules[0].summary).toContain('matching "relationships"');
    expect(rules[2].summary).toContain('past 7 days');
  });
});

describe('anonymous prompt participation with opt-in public results (#358)', () => {
  it('counts only explicitly opted-in responses in public aggregated results', () => {
    const optInSubmission = createAnonymousPromptSubmission({
      promptId: DEFAULT_ANONYMOUS_PROMPT.id,
      optionId: 'fear-of-recognition',
      includeInPublicResults: true,
      submittedAt: '2026-03-30T11:00:00.000Z',
    });
    const privateSubmission = createAnonymousPromptSubmission({
      promptId: DEFAULT_ANONYMOUS_PROMPT.id,
      optionId: 'protecting-others',
      includeInPublicResults: false,
      submittedAt: '2026-03-30T11:05:00.000Z',
    });

    const summary = computeOptInPublicPromptResults(
      DEFAULT_ANONYMOUS_PROMPT,
      [optInSubmission, privateSubmission],
      false,
    );

    expect(summary.totalOptInResponses).toBe(1);
    expect(summary.privateOnlyResponsesCount).toBe(1);
    const optedInOption = summary.options.find(
      (opt) => opt.optionId === 'fear-of-recognition',
    );
    const privateOption = summary.options.find(
      (opt) => opt.optionId === 'protecting-others',
    );
    expect(optedInOption?.optInCount).toBe(1);
    expect(optedInOption?.percentage).toBe(100);
    expect(privateOption?.optInCount).toBe(0);
  });
});
