"use client";

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
      <div className="message user animate-fadeInUp">
        <div className="message-content">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="message assistant animate-fadeInUp">
      <div className={`message-content ${isStreaming ? 'loading' : ''}`}>
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
                  <div className="code-block__header" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', background: 'rgba(255,255,255,0.1)' }}>
                    <span className="code-block__lang" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{lang}</span>
                    <button
                      className="btn-icon"
                      style={{ fontSize: "0.7rem", gap: 4, background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
                      onClick={() => navigator.clipboard.writeText(code)}
                    >
                      Copy
                    </button>
                  </div>
                  <SyntaxHighlighter
                    language={lang}
                    style={vscDarkPlus}
                    customStyle={{ margin: 0, borderRadius: 0, fontSize: "0.8rem", background: "rgba(0,0,0,0.5)", padding: "0.8rem" }}
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

        {message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <SourceReferences sources={message.sources} />
          </div>
        )}

        {message.tokensUsed && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
            {message.tokensUsed} tokens
          </div>
        )}

        {followUps.length > 0 && (
          <div className="quick-recommendations" style={{ marginTop: 16 }}>
            {followUps.map((q) => (
              <button
                key={q}
                className="recommendation-chip"
                onClick={() => onFollowUp?.(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
