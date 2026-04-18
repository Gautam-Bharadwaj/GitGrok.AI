"use client";

/**
 * components/AnalysisPanel.tsx — Sidebar panel with Bugs, README, and Files tabs.
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analysisApi } from "@/lib/api";
import { useChatStore, SidebarTab } from "@/store/chatStore";
import CodeSnippet from "./CodeSnippet";

const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "bugs",
    label: "Bugs",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"/>
      </svg>
    ),
  },
  {
    id: "readme",
    label: "README",
    icon: (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
];

const SEV_CLASS: Record<string, string> = {
  CRITICAL: "badge-critical",
  WARNING:  "badge-warning",
  INFO:     "badge-info",
};

export default function AnalysisPanel() {
  const {
    activeRepoId,
    bugs, readme,
    bugsLoading, readmeLoading,
    setBugs, setReadme,
    setBugsLoading, setReadmeLoading,
    sidebarTab, setSidebarTab,
  } = useChatStore();

  const handleRunBugs = async () => {
    if (!activeRepoId || bugsLoading) return;
    setBugsLoading(true);
    try {
      const res = await analysisApi.bugs(activeRepoId);
      setBugs(res.findings);
    } catch (e: any) {
      console.error(e);
    } finally {
      setBugsLoading(false);
    }
  };

  const handleGenReadme = async () => {
    if (!activeRepoId || readmeLoading) return;
    setReadmeLoading(true);
    try {
      const res = await analysisApi.readme(activeRepoId);
      setReadme(res.markdown);
    } catch (e: any) {
      console.error(e);
    } finally {
      setReadmeLoading(false);
    }
  };

  const handleCopyReadme = () => {
    if (readme) navigator.clipboard.writeText(readme);
  };

  const handleDownloadReadme = () => {
    if (!readme) return;
    const blob = new Blob([readme], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "README.md";
    a.click();
  };

  if (!activeRepoId) {
    return (
      <div className="analysis-empty">
        <p>Select a repository to run analysis.</p>
        <style jsx>{`
          .analysis-empty {
            padding: 2rem 1rem; color: var(--text-muted);
            font-size: 0.82rem; text-align: center;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="ap">
      {/* Tab bar */}
      <div className="ap__tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            id={`analysis-tab-${tab.id}`}
            className={`ap__tab ${sidebarTab === tab.id ? "ap__tab--active" : ""}`}
            onClick={() => setSidebarTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bugs tab */}
      {sidebarTab === "bugs" && (
        <div className="ap__body animate-fadeIn">
          <button
            id="run-bugs-btn"
            className="btn btn-primary"
            style={{ width: "100%", marginBottom: "1rem" }}
            onClick={handleRunBugs}
            disabled={bugsLoading}
          >
            {bugsLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Scanning…</> : "🔍 Scan for Bugs"}
          </button>

          {bugs.length === 0 && !bugsLoading && (
            <p className="ap__hint">Run a scan to detect security issues and logic bugs.</p>
          )}

          {bugs.map((bug, i) => (
            <div key={i} className="bug-card glass">
              <div className="bug-card__header">
                <span className={`badge ${SEV_CLASS[bug.severity] ?? "badge-info"}`}>
                  {bug.severity === "CRITICAL" ? "🔴" : bug.severity === "WARNING" ? "🟡" : "🔵"} {bug.severity}
                </span>
                <span className="bug-card__file truncate">
                  {bug.file}:{bug.line_range}
                </span>
              </div>
              <p className="bug-card__desc">{bug.description}</p>
              <p className="bug-card__suggestion">💡 {bug.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* README tab */}
      {sidebarTab === "readme" && (
        <div className="ap__body animate-fadeIn">
          <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
            <button
              id="gen-readme-btn"
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleGenReadme}
              disabled={readmeLoading}
            >
              {readmeLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generating…</> : "📄 Generate README"}
            </button>
            {readme && (
              <>
                <button id="copy-readme-btn" className="btn btn-ghost" onClick={handleCopyReadme} title="Copy">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </button>
                <button id="download-readme-btn" className="btn btn-ghost" onClick={handleDownloadReadme} title="Download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </button>
              </>
            )}
          </div>

          {readme ? (
            <div className="readme-preview glass">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
            </div>
          ) : (
            !readmeLoading && <p className="ap__hint">Generate a professional README based on the codebase.</p>
          )}
        </div>
      )}

      <style jsx>{`
        .ap { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
        .ap__tabs {
          display: flex; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: var(--bg-surface); flex-shrink: 0;
        }
        .ap__tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 10px 8px; font-size: 0.78rem; font-weight: 500;
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          transition: all var(--transition-fast);
          border-bottom: 2px solid transparent;
        }
        .ap__tab:hover { color: var(--text-primary); }
        .ap__tab--active { color: var(--accent-3); border-bottom-color: var(--accent-2); }
        .ap__body { flex: 1; overflow-y: auto; padding: 1rem; }
        .ap__hint { font-size: 0.8rem; color: var(--text-muted); text-align: center; }
        .bug-card {
          padding: 10px 12px; margin-bottom: 8px;
          border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06);
        }
        .bug-card__header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .bug-card__file { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); }
        .bug-card__desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px; }
        .bug-card__suggestion { font-size: 0.76rem; color: var(--text-muted); }
        .readme-preview {
          padding: 1rem; border-radius: var(--radius-sm);
          font-size: 0.82rem; line-height: 1.7; color: var(--text-secondary);
          overflow-y: auto; max-height: calc(100vh - 220px);
        }
        .readme-preview :global(h1),
        .readme-preview :global(h2),
        .readme-preview :global(h3) { color: var(--text-primary); margin: 0.8em 0 0.4em; }
        .readme-preview :global(code) {
          font-family: var(--font-mono); font-size: 0.8em;
          background: rgba(124,58,237,0.12); color: var(--accent-3);
          padding: 1px 5px; border-radius: 3px;
        }
        .readme-preview :global(pre) { overflow-x: auto; }
        .readme-preview :global(a) { color: var(--accent-3); }
        .readme-preview :global(hr) { border-color: rgba(255,255,255,0.08); }
      `}</style>
    </div>
  );
}
