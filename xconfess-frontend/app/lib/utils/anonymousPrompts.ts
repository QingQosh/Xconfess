export interface AnonymousPromptOption {
  id: string;
  label: string;
}

export interface AnonymousPromptDefinition {
  id: string;
  question: string;
  context: string;
  options: AnonymousPromptOption[];
}

export interface AnonymousPromptResponse {
  promptId: string;
  optionId: string;
  reflection?: string;
  includeInPublicResults: boolean;
  submittedAt: string;
}

export interface PublicPromptOptionAggregate {
  optionId: string;
  label: string;
  optInCount: number;
  percentage: number;
}

export interface PublicPromptResultsSummary {
  promptId: string;
  totalOptInResponses: number;
  privateOnlyResponsesCount: number;
  options: PublicPromptOptionAggregate[];
}

export const ANONYMOUS_PROMPT_STORAGE_KEY = 'xconfess_anonymous_prompt_responses';

export const DEFAULT_ANONYMOUS_PROMPT: AnonymousPromptDefinition = {
  id: 'prompt-unspoken-truth-2026',
  question: 'What keeps you from sharing an honest confession right away?',
  context:
    'Responses are always anonymous. Your choice is only counted in public results if you explicitly opt in below.',
  options: [
    { id: 'fear-of-recognition', label: 'Worried someone might recognize the story' },
    { id: 'finding-right-words', label: 'Still finding the right words to express it' },
    { id: 'protecting-others', label: 'Protecting someone else involved' },
    { id: 'ready-to-share', label: 'Nothing — I feel ready to share anonymously' },
  ],
};

const SEED_PUBLIC_COUNTS: Record<string, number> = {
  'fear-of-recognition': 18,
  'finding-right-words': 14,
  'protecting-others': 11,
  'ready-to-share': 9,
};

export function createAnonymousPromptSubmission(input: {
  promptId: string;
  optionId: string;
  reflection?: string;
  includeInPublicResults: boolean;
  submittedAt?: string;
}): AnonymousPromptResponse {
  const trimmedReflection = input.reflection?.trim();
  return {
    promptId: input.promptId,
    optionId: input.optionId,
    ...(trimmedReflection ? { reflection: trimmedReflection.slice(0, 280) } : {}),
    includeInPublicResults: Boolean(input.includeInPublicResults),
    submittedAt: input.submittedAt ?? new Date().toISOString(),
  };
}

export function computeOptInPublicPromptResults(
  prompt: AnonymousPromptDefinition,
  responses: AnonymousPromptResponse[],
  includeSeedBaseline = true,
): PublicPromptResultsSummary {
  const matching = responses.filter((r) => r.promptId === prompt.id);
  const optInResponses = matching.filter((r) => r.includeInPublicResults);
  const privateOnlyResponsesCount = matching.length - optInResponses.length;

  const countsByOption = new Map<string, number>();
  for (const option of prompt.options) {
    const seed = includeSeedBaseline ? SEED_PUBLIC_COUNTS[option.id] ?? 0 : 0;
    countsByOption.set(option.id, seed);
  }

  for (const response of optInResponses) {
    if (countsByOption.has(response.optionId)) {
      countsByOption.set(
        response.optionId,
        (countsByOption.get(response.optionId) ?? 0) + 1,
      );
    }
  }

  const totalOptInResponses = Array.from(countsByOption.values()).reduce(
    (sum, val) => sum + val,
    0,
  );

  const options: PublicPromptOptionAggregate[] = prompt.options.map((option) => {
    const optInCount = countsByOption.get(option.id) ?? 0;
    const percentage =
      totalOptInResponses > 0
        ? Math.round((optInCount / totalOptInResponses) * 100)
        : 0;
    return {
      optionId: option.id,
      label: option.label,
      optInCount,
      percentage,
    };
  });

  return {
    promptId: prompt.id,
    totalOptInResponses,
    privateOnlyResponsesCount,
    options,
  };
}

export function loadAnonymousPromptResponses(): AnonymousPromptResponse[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(ANONYMOUS_PROMPT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is AnonymousPromptResponse =>
        Boolean(
          item &&
            typeof item === 'object' &&
            typeof item.promptId === 'string' &&
            typeof item.optionId === 'string' &&
            typeof item.includeInPublicResults === 'boolean',
        ),
    );
  } catch {
    return [];
  }
}

export function saveAnonymousPromptResponse(
  submission: AnonymousPromptResponse,
): AnonymousPromptResponse[] {
  const existing = loadAnonymousPromptResponses().filter(
    (item) => item.promptId !== submission.promptId,
  );
  const updated = [submission, ...existing];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        ANONYMOUS_PROMPT_STORAGE_KEY,
        JSON.stringify(updated),
      );
    } catch {
      // Ignore storage errors
    }
  }
  return updated;
}
