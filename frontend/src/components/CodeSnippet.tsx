"use client";

/**
 * components/CodeSnippet.tsx — Syntax-highlighted code block with copy button.
 */

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Props {
  code: string;
  language?: string;
  fileName?: string;
  lineRange?: string;
  maxHeight?: number;
}

export default function CodeSnippet({
  code,
  language = "plaintext",
  fileName,
  lineRange,
  maxHeight = 400,
}: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block">
      <div className="code-block__header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="code-block__lang">{language}</span>
          {fileName && (
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
              {fileName}
              {lineRange && `:${lineRange}`}
            </span>
          )}
        </div>
        <button
          id={`copy-btn-${fileName ?? language}`}
          onClick={handleCopy}
          className="btn-icon"
          title="Copy code"
          style={{ fontSize: "0.72rem", gap: 4 }}
        >
          {copied ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <div style={{ maxHeight, overflowY: "auto" }}>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: "0.8rem",
            lineHeight: 1.6,
            background: "transparent",
            padding: "1rem",
          }}
          showLineNumbers
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
