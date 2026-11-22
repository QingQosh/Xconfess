"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Lock, BarChart3, CheckCircle2, Eye, EyeOff } from "lucide-react";
import {
  computeOptInPublicPromptResults,
  createAnonymousPromptSubmission,
  DEFAULT_ANONYMOUS_PROMPT,
  loadAnonymousPromptResponses,
  saveAnonymousPromptResponse,
  type AnonymousPromptDefinition,
  type AnonymousPromptResponse,
} from "@/app/lib/utils/anonymousPrompts";

interface AnonymousPromptCardProps {
  prompt?: AnonymousPromptDefinition;
  includeSeedBaseline?: boolean;
  className?: string;
}

export const AnonymousPromptCard: React.FC<AnonymousPromptCardProps> = ({
  prompt = DEFAULT_ANONYMOUS_PROMPT,
  includeSeedBaseline = true,
  className = "",
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [includeInPublicResults, setIncludeInPublicResults] = useState<boolean>(false);
  const [responses, setResponses] = useState<AnonymousPromptResponse[]>([]);
  const [submittedResponse, setSubmittedResponse] =
    useState<AnonymousPromptResponse | null>(null);
  const [showPublicResults, setShowPublicResults] = useState<boolean>(false);

  useEffect(() => {
    const loaded = loadAnonymousPromptResponses();
    setResponses(loaded);
    const existing = loaded.find((r) => r.promptId === prompt.id) ?? null;
    if (existing) {
      setSubmittedResponse(existing);
      setSelectedOptionId(existing.optionId);
      setIncludeInPublicResults(existing.includeInPublicResults);
      setShowPublicResults(true);
    }
  }, [prompt.id]);

  const publicSummary = useMemo(
    () =>
      computeOptInPublicPromptResults(
        prompt,
        responses,
        includeSeedBaseline,
      ),
    [prompt, responses, includeSeedBaseline],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId) return;

    const submission = createAnonymousPromptSubmission({
      promptId: prompt.id,
      optionId: selectedOptionId,
      includeInPublicResults,
    });
    const updated = saveAnonymousPromptResponse(submission);
    setResponses(updated);
    setSubmittedResponse(submission);
    setShowPublicResults(true);
  };

  return (
    <section
      aria-label="Anonymous community prompt"
      className={`luxury-panel rounded-2xl border border-[var(--border)] p-6 space-y-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="eyebrow flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            Anonymous Prompt • Opt-In Public Results
          </p>
          <h3 className="font-editorial text-2xl sm:text-3xl text-[var(--foreground)]">
            {prompt.question}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--secondary)]">
            {prompt.context}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowPublicResults((prev) => !prev)}
          aria-expanded={showPublicResults}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--surface-strong)] transition-colors"
        >
          <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          {showPublicResults ? "Hide public results" : "View opt-in public results"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-2.5">
          <legend className="sr-only">{prompt.question}</legend>
          {prompt.options.map((option) => {
            const isSelected = selectedOptionId === option.id;
            return (
              <label
                key={option.id}
                htmlFor={`prompt-option-${option.id}`}
                className={`flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-colors text-sm ${
                  isSelected
                    ? "border-purple-500 bg-purple-950/30 text-[var(--foreground)] font-medium"
                    : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                <input
                  id={`prompt-option-${option.id}`}
                  type="radio"
                  name={`anonymous-prompt-${prompt.id}`}
                  value={option.id}
                  checked={isSelected}
                  onChange={() => setSelectedOptionId(option.id)}
                  className="h-4 w-4 accent-purple-500"
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </fieldset>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-3.5">
          <label
            htmlFor="prompt-opt-in-public-results"
            className="flex items-start gap-3 cursor-pointer text-xs sm:text-sm text-[var(--foreground)]"
          >
            <input
              id="prompt-opt-in-public-results"
              type="checkbox"
              checked={includeInPublicResults}
              onChange={(e) => setIncludeInPublicResults(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-purple-500"
            />
            <span className="space-y-0.5">
              <span className="block font-medium">
                Include my anonymous response in public aggregated prompt results
              </span>
              <span className="block text-xs text-[var(--secondary)]">
                Leave unchecked to respond privately without incrementing the public tally. No user account identifier is ever attached.
              </span>
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {submittedResponse ? (
            <p
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400"
            >
              {submittedResponse.includeInPublicResults ? (
                <>
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  Recorded anonymously &amp; included in opt-in public results.
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Recorded privately — excluded from public aggregated totals.
                </>
              )}
            </p>
          ) : (
            <span className="text-xs text-[var(--secondary)]">
              Select an option to participate anonymously.
            </span>
          )}

          <button
            type="submit"
            disabled={!selectedOptionId}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-xs sm:text-sm font-medium text-white transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {submittedResponse ? "Update Anonymous Response" : "Submit Anonymous Response"}
          </button>
        </div>
      </form>

      {showPublicResults && (
        <div
          role="region"
          aria-label="Opt-in public prompt results"
          className="pt-4 border-t border-[var(--border)] space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--secondary)]">
            <span className="font-semibold text-[var(--foreground)]">
              Opt-In Public Results ({publicSummary.totalOptInResponses} opted-in responses)
            </span>
            <span>
              Only participants who explicitly opted in are counted here
            </span>
          </div>

          <div className="space-y-2.5">
            {publicSummary.options.map((opt) => (
              <div key={opt.optionId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--foreground)]">{opt.label}</span>
                  <span className="text-[var(--secondary)] font-medium">
                    {opt.percentage}% ({opt.optInCount})
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-purple-500 transition-all"
                    style={{ width: `${opt.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
