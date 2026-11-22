export type TopicTimeWindow = '24h' | '7days' | '30days' | 'all';

export interface TopicInclusionRule {
  id: string;
  title: string;
  summary: string;
  inclusionCondition: string;
  exclusionCondition: string;
}

const WINDOW_DESCRIPTIONS: Record<TopicTimeWindow, string> = {
  '24h': 'last 24 hours',
  '7days': 'past 7 days',
  '30days': 'past 30 days',
  all: 'all-time public history',
};

export function getTopicInclusionRules(
  period: TopicTimeWindow = '24h',
  activeTopicQuery?: string,
): TopicInclusionRule[] {
  const windowText = WINDOW_DESCRIPTIONS[period] ?? WINDOW_DESCRIPTIONS['24h'];
  const topicScope = activeTopicQuery?.trim()
    ? `matching "${activeTopicQuery.trim()}"`
    : 'across public topics';

  return [
    {
      id: 'moderation-safety',
      title: 'Moderation & Safety Clearance',
      summary: `Only published confessions ${topicScope} that pass automated safety filters and community moderation appear on public topic pages.`,
      inclusionCondition: 'Post is public, published, and free of active moderation holds.',
      exclusionCondition: 'Pending review, flagged for personally identifiable details, or removed posts are excluded.',
    },
    {
      id: 'privacy-consent',
      title: 'Author Privacy & Discovery Controls',
      summary: 'Public topic and trending feeds respect user-level privacy and data-processing preferences.',
      inclusionCondition: 'Submitted as a public anonymous confession eligible for discovery.',
      exclusionCondition: 'Drafts, deleted posts, or records restricted by privacy controls are never listed.',
    },
    {
      id: 'k-anonymity-threshold',
      title: 'Minimum Activity & k-Anonymity Threshold',
      summary: `Topics and ranked confessions within the ${windowText} require minimum community engagement so isolated posts cannot be singled out.`,
      inclusionCondition: `Meets minimum reaction and activity threshold within the ${windowText}.`,
      exclusionCondition: 'Zero-activity or below-threshold cohorts are omitted from public topic rankings.',
    },
    {
      id: 'ranking-decay',
      title: 'Engagement Velocity & Recency Decay',
      summary: `Rankings combine total verified reactions (likes and loves) weighted by recency over the ${windowText}.`,
      inclusionCondition: 'Ranked by time-decayed reaction velocity within the selected window.',
      exclusionCondition: 'Duplicate reactions or bursts from rate-limited sessions do not inflate topic rank.',
    },
  ];
}
