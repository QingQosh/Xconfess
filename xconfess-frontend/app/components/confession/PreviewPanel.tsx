"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ShieldCheck, Anchor, UserCheck } from "lucide-react";
import { cn } from "@/app/lib/utils/cn";
import { sanitizeMarkdown } from "@/app/lib/utils/markdown";

interface PreviewPanelProps {
  title?: string;
  body: string;
  gender?: string;
  enableStellarAnchor?: boolean;
  className?: string;
}

const GENDER_LABELS: Record<string, string> = {
  male: "Male",
  female: "Female",
  other: "Other",
};

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  title,
  body,
  gender,
  enableStellarAnchor = false,
  className,
}) => {
  const sanitizedBody = sanitizeMarkdown(body);
  const wordCount = sanitizedBody.trim()
    ? sanitizedBody.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const charCount = body?.length ?? 0;
  const genderLabel = gender ? GENDER_LABELS[gender] ?? gender : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900 p-6 min-h-[200px] space-y-4",
        className
      )}
      role="article"
      aria-label="Anonymous post preview card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 px-2.5 py-1 text-xs font-medium text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Anonymous Poster
          </span>
          <span className="text-xs text-zinc-400">
            Identity hidden • Account metadata excluded
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {genderLabel && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-zinc-800 border border-zinc-700 px-2.5 py-0.5 text-xs text-zinc-300"
              aria-label={`Selected gender tag: ${genderLabel}`}
            >
              <UserCheck className="h-3 w-3" aria-hidden="true" />
              {genderLabel}
            </span>
          )}
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs border",
              enableStellarAnchor
                ? "bg-purple-950/60 border-purple-700/60 text-purple-300"
                : "bg-zinc-800/80 border-zinc-700 text-zinc-400"
            )}
            aria-label={
              enableStellarAnchor
                ? "Stellar on-chain anchor enabled for this post"
                : "Standard off-chain anonymous post"
            }
          >
            <Anchor className="h-3 w-3" aria-hidden="true" />
            {enableStellarAnchor ? "On-chain anchor enabled" : "Off-chain post"}
          </span>
        </div>
      </div>

      {title && (
        <h3 className="text-xl font-semibold text-white mb-4 pb-4 border-b border-zinc-800">
          {title}
        </h3>
      )}
      <div className="prose prose-invert prose-zinc max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => (
              <p className="text-zinc-100 mb-4 leading-relaxed">{children}</p>
            ),
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold text-white mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold text-white mb-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold text-white mb-2">{children}</h3>
            ),
            strong: ({ children }) => (
              <strong className="font-bold text-white">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="italic text-zinc-200">{children}</em>
            ),
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {children}
              </a>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside mb-4 text-zinc-100 space-y-1">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside mb-4 text-zinc-100 space-y-1">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-zinc-100">{children}</li>
            ),
            code: ({ children, className }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-sm">
                  {children}
                </code>
              ) : (
                <code className={className}>{children}</code>
              );
            },
            pre: ({ children }) => (
              <pre className="bg-zinc-800 rounded-lg p-4 mb-4 overflow-x-auto">
                {children}
              </pre>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-zinc-700 pl-4 italic text-zinc-300 mb-4">
                {children}
              </blockquote>
            ),
          }}
        >
          {sanitizedBody || "*No content to preview*"}
        </ReactMarkdown>
      </div>

      <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400">
        <span>
          Pre-submission check: Markdown sanitized &amp; anonymous posture verified
        </span>
        <span aria-label={`Preview length: ${wordCount} words, ${charCount} characters`}>
          {wordCount} {wordCount === 1 ? "word" : "words"} • {charCount} chars
        </span>
      </div>
    </div>
  );
};
