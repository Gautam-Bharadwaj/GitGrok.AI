"use client";

/**
 * components/MessageBubble.tsx — Renders a single chat message.
 *
 * - User messages: right-aligned pill
 * - Assistant messages: left-aligned with markdown rendering, code blocks,
 *   source references, suggested follow-ups, and a streaming cursor
 */

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { UIMessage } from "@/store/chatStore";
import SourceReferences from "./SourceReferences";

const FOLLOW_UPS: Record<string, string[]> = {
  default: [
    "Explain the overall architecture",
    "Find potential security issues",
    "Generate a README for this repo",
  ],
};

interface Props {
  message: UIMessage;
  onFollowUp?: (q: string) => void;
  isLast?: boolean;
}

export default function MessageBubble({ message, onFollowUp, isLast }: Props) {
  const isUser      = message.role === "user";
  const isStreaming = message.isStreaming;

  const followUps = useMemo(
    () => (!isUser && isLast && !isStreaming ? FOLLOW_UPS.default : []),
    [isUser, isLast, isStreaming]
  );

  if (isUser) {
    return (
      <div className="msg msg--user">
        <div className="msg__bubble msg__bubble--user">
          {message.content}
        </div>
        <style jsx>{`
          .msg { display: flex; justify-content: flex-end; margin: 8px 0; }
          .msg__bubble { padding: 10px 14px; border-radius: 18px 18px 4px 18px;
            max-width: 70%; font-size: 0.875rem; line-height: 1.55; }
          .msg__bubble--user {
            background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
            color: #fff; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="msg msg--assistant animate-fadeInUp">
      <div className="msg__avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v4l3 3"/>
        </svg>
      </div>

      <div className="msg__body">
        <div className="msg__content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                const lang  = match ? match[1] : "plaintext";
                const code  = String(children).replace(/\n$/, "");
                if (inline) {
                  return <code className="inline-code" {...props}>{children}</code>;
                }
                return (
                  <div className="code-block" style={{ margin: "10px 0" }}>
                    <div className="code-block__header">
                      <span className="code-block__lang">{lang}</span>
                      <button
                        className="btn-icon"
                        style={{ fontSize: "0.7rem", gap: 4 }}
                        onClick={() => navigator.clipboard.writeText(code)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                      </button>
                    </div>
                    <SyntaxHighlighter
                      language={lang}
                      style={vscDarkPlus}
                      customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem", background: "transparent", padding: "0.8rem" }}
                      showLineNumbers
                    >
                      {code}
                    </SyntaxHighlighter>
                  </div>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && <span className="cursor" />}
        </div>

        {message.sources && message.sources.length > 0 && (
          <SourceReferences sources={message.sources} />
        )}

        {message.tokensUsed && (
          <span className="msg__tokens">{message.tokensUsed} tokens</span>
        )}

        {followUps.length > 0 && (
          <div className="msg__followups">
            {followUps.map((q) => (
              <button
                key={q}
                className="followup-btn"
                onClick={() => onFollowUp?.(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .msg { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; margin: 0; width: 100%; border-bottom: 1px solid rgba(255,255,255,0.02); }
        .msg--user { flex-direction: row; }
        .msg__bubble--user {
          flex: 1; padding: 0 4px; font-size: 0.95rem; line-height: 1.6; color: var(--text-primary);
        }
        
        .msg--assistant { flex-direction: row; }
        .msg__avatar {
          width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: #ffffff; color: #000000; box-shadow: 0 0 10px rgba(255,255,255,0.1);
        }
        .msg__body { flex: 1; min-width: 0; }
        .msg__content {
          padding: 0 4px;
          font-size: 0.95rem; line-height: 1.6;
          color: var(--text-primary);
        }
        .msg__content :global(p) { margin-bottom: 1em; }
        .msg__content :global(p:last-child) { margin-bottom: 0; }
        .msg__content :global(ul), .msg__content :global(ol) { padding-left: 1.2rem; margin-bottom: 1em; }
        .msg__content :global(li) { margin-bottom: 0.25em; }
        .msg__content :global(.inline-code) {
          font-family: var(--font-mono); font-size: 0.85em;
          background: var(--bg-surface); color: var(--text-primary);
          padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.08);
        }
        .cursor {
          display: inline-block; width: 2px; height: 1em;
          background: var(--text-primary); margin-left: 2px;
          animation: blink 0.8s step-end infinite; vertical-align: text-bottom;
        }
        @keyframes blink { 50% { opacity: 0; } }
        .msg__tokens {
          display: block; font-size: 0.7rem; color: var(--text-muted);
          margin-top: 10px;
        }
        .msg__followups { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
        .followup-btn {
          font-size: 0.8rem; padding: 6px 12px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px; color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition-fast);
          white-space: nowrap;
        }
        .followup-btn:hover {
          background: var(--bg-surface);
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.2);
        }
      `}</style>
    </div>
  );
}
