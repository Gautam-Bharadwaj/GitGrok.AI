"use client";

import React, { useEffect, useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { analysisApi } from "@/lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function FileViewerModal() {
  const selectedSource = useChatStore((s) => s.selectedSource);
  const setSelectedSource = useChatStore((s) => s.setSelectedSource);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedSource && activeRepoId) {
      setLoading(true);
      analysisApi.read(activeRepoId, selectedSource.file_path)
        .then(res => setContent(res.content))
        .catch(err => setContent(`Error loading file: ${err.message}`))
        .finally(() => setLoading(false));
    } else {
      setContent(null);
    }
  }, [selectedSource, activeRepoId]);

  if (!selectedSource) return null;

  return (
    <div className="file-viewer-overlay animate-fadeIn" onClick={() => setSelectedSource(null)}>
      <div className="file-viewer-content animate-slideInRight" onClick={(e) => e.stopPropagation()}>
        <header className="file-viewer-header">
          <div className="file-info">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <div className="file-meta">
              <span className="file-name">{selectedSource.file_path.split('/').pop()}</span>
              <span className="file-path">{selectedSource.file_path}</span>
            </div>
          </div>
          <button className="btn-close" onClick={() => setSelectedSource(null)}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="file-viewer-body">
          {loading ? (
            <div className="viewer-loading">
              <div className="spinner"></div>
              <span>Fetching source code...</span>
            </div>
          ) : (
            <SyntaxHighlighter
              language={selectedSource.language || "javascript"}
              style={vscDarkPlus}
              showLineNumbers
              startingLineNumber={1}
              wrapLines={true}
              lineProps={(lineNumber) => {
                const style: React.CSSProperties = { display: "block", width: "100%" };
                if (lineNumber >= selectedSource.start_line && lineNumber <= selectedSource.end_line) {
                  style.backgroundColor = "rgba(255, 102, 0, 0.15)";
                  style.borderLeft = "2px solid var(--primary)";
                }
                return { style };
              }}
              customStyle={{
                margin: 0,
                padding: "20px",
                fontSize: "0.85rem",
                background: "transparent",
                height: "100%",
              }}
            >
              {content || ""}
            </SyntaxHighlighter>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .file-viewer-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 2000;
          display: flex;
          justify-content: flex-end;
        }
        .file-viewer-content {
          width: 800px;
          max-width: 90%;
          background: #0a0a0a;
          height: 100%;
          display: flex;
          flex-direction: column;
          border-left: 1px solid var(--border);
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }
        .file-viewer-header {
          padding: 16px 24px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255,255,255,0.02);
        }
        .file-info { display: flex; align-items: center; gap: 12px; }
        .file-meta { display: flex; flex-direction: column; }
        .file-name { font-weight: 600; font-size: 0.95rem; }
        .file-path { font-size: 0.75rem; color: var(--text-muted); font-family: monospace; }
        .btn-close { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: color 0.2s; }
        .btn-close:hover { color: var(--text); }
        .file-viewer-body { flex: 1; overflow: auto; background: #0d0d0d; }
        .viewer-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; color: var(--text-muted); }
        .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
