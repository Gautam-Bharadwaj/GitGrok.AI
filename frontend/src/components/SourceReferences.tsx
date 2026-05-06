"use client";

/**
 * components/SourceReferences.tsx — Collapsible list of RAG source citations.
 *
 * Shows file path, line range, and an expandable syntax-highlighted snippet
 * for each retrieved chunk that informed the assistant's answer.
 */

import { useState } from "react";
import type { Source } from "@/lib/api";
import CodeSnippet from "./CodeSnippet";
import { useChatStore } from "@/store/chatStore";

interface Props {
  sources: Source[];
}

export default function SourceReferences({ sources }: Props) {
  const [open, setOpen] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const setSelectedSource = useChatStore((s) => s.setSelectedSource);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="sources">
      <button
        id="sources-toggle-btn"
        className="sources__toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span>{sources.length} source{sources.length !== 1 ? "s" : ""}</span>
      </button>

      {open && (
        <div className="sources__list animate-fadeInUp">
          {sources.map((src, i) => (
            <div key={i} className="source-item">
              <button
                className="source-item__header"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="source-item__path truncate">
                  {src.file_path}
                  <span className="source-item__lines">
                    :L{src.start_line}-{src.end_line}
                  </span>
                </span>
                {src.name && (
                  <span className="source-item__name">{src.name}</span>
                )}
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    marginLeft: "auto", flexShrink: 0,
                    transform: expandedIdx === i ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                    marginRight: "8px"
                  }}
                >
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                <button 
                  className="btn-view-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSource(src);
                  }}
                >
                  View Full File
                </button>
              </button>
              {expandedIdx === i && (
                <div className="source-item__snippet animate-fadeIn">
                  <CodeSnippet
                    code={src.snippet}
                    language={src.language || "plaintext"}
                    fileName={src.file_path.split("/").pop()}
                    lineRange={`L${src.start_line}-${src.end_line}`}
                    maxHeight={200}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .sources { margin-top: 10px; }
        .sources__toggle {
          display: flex; align-items: center; gap: 6px;
          background: none; border: none; cursor: pointer;
          color: var(--text-muted); font-size: 0.78rem;
          padding: 4px 0; transition: color var(--transition-fast);
        }
        .sources__toggle:hover { color: var(--accent-3); }
        .sources__list {
          display: flex; flex-direction: column; gap: 6px; margin-top: 8px;
        }
        .source-item {
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-sm);
          overflow: hidden;
        }
        .source-item__header {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 10px;
          background: var(--bg-glass); border: none; cursor: pointer;
          color: var(--text-secondary); font-size: 0.78rem;
          transition: background var(--transition-fast);
        }
        .source-item__header:hover { background: var(--bg-glass-hover); color: var(--text-primary); }
        .source-item__path { font-family: var(--font-mono); flex: 1; text-align: left; }
        .source-item__lines { color: var(--text-muted); margin-left: 2px; }
        .source-item__name {
          font-size: 0.7rem; color: var(--accent-3);
          background: rgba(234, 88, 12, 0.1); padding: 1px 6px;
          border-radius: 99px; white-space: nowrap;
        }
        .source-item__snippet { border-top: 1px solid rgba(255,255,255,0.06); }
        .btn-view-full {
          font-size: 0.65rem;
          background: var(--primary);
          color: #000;
          border: none;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 600;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .btn-view-full:hover { opacity: 1; }
      `}</style>
    </div>
  );
}
