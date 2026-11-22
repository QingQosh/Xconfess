"use client";

import React, { useState } from "react";
import { ShieldCheck, Info, ChevronDown, ChevronUp, CheckCircle2, XCircle } from "lucide-react";
import {
  getTopicInclusionRules,
  type TopicTimeWindow,
} from "@/app/lib/utils/topicInclusionRules";

interface TopicInclusionRulesPanelProps {
  period?: TopicTimeWindow;
  activeTopicQuery?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const TopicInclusionRulesPanel: React.FC<TopicInclusionRulesPanelProps> = ({
  period = "24h",
  activeTopicQuery,
  defaultExpanded = false,
  className = "",
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const rules = getTopicInclusionRules(period, activeTopicQuery);

  return (
    <section
      aria-label="Public topic inclusion rules"
      className={`rounded-xl border border-zinc-800 bg-zinc-900/90 p-5 text-white ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-purple-950/70 border border-purple-700/50 p-2 text-purple-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              How Public Topic Pages Select &amp; Rank Confessions
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Transparency notice: Posts appear here only when they satisfy moderation, privacy, and minimum engagement inclusion rules.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls="topic-inclusion-rules-details"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition-colors"
        >
          <Info className="h-3.5 w-3.5 text-purple-400" aria-hidden="true" />
          {expanded ? "Hide inclusion rules" : "Explain inclusion rules"}
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>

      {expanded && (
        <div
          id="topic-inclusion-rules-details"
          className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3.5 space-y-2"
            >
              <h3 className="text-sm font-semibold text-purple-300">
                {rule.title}
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {rule.summary}
              </p>
              <div className="space-y-1 pt-1 text-xs">
                <p className="flex items-start gap-1.5 text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>Included:</strong> {rule.inclusionCondition}
                  </span>
                </p>
                <p className="flex items-start gap-1.5 text-amber-300/90">
                  <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <strong>Excluded:</strong> {rule.exclusionCondition}
                  </span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
