"use client";

/**
 * components/AnalysisPanel.tsx — Sidebar panel with Bugs, README, and Files tabs.
 */

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { analysisApi } from "@/lib/api";
import { useChatStore, SidebarTab } from "@/store/chatStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

export default function AnalysisPanel() {
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  const bugs = useChatStore((s) => s.bugs);
  const readme = useChatStore((s) => s.readme);
  const bugsLoading = useChatStore((s) => s.bugsLoading);
  const readmeLoading = useChatStore((s) => s.readmeLoading);
  const setBugs = useChatStore((s) => s.setBugs);
  const setReadme = useChatStore((s) => s.setReadme);
  const setBugsLoading = useChatStore((s) => s.setBugsLoading);
  const setReadmeLoading = useChatStore((s) => s.setReadmeLoading);
  const sidebarTab = useChatStore((s) => s.sidebarTab);
  const setSidebarTab = useChatStore((s) => s.setSidebarTab);
  const [panelError, setPanelError] = useState<string | null>(null);
  const severityToVariant = (severity: string): "critical" | "warning" | "default" => {
    if (severity === "CRITICAL") return "critical";
    if (severity === "WARNING") return "warning";
    return "default";
  };

  const handleRunBugs = async () => {
    if (!activeRepoId || bugsLoading) return;
    setBugsLoading(true);
    setPanelError(null);
    try {
      const res = await analysisApi.bugs(activeRepoId);
      setBugs(res.findings);
    } catch (e: any) {
      setPanelError(e?.message ?? "Failed to run bug scan.");
    } finally {
      setBugsLoading(false);
    }
  };

  const handleGenReadme = async () => {
    if (!activeRepoId || readmeLoading) return;
    setReadmeLoading(true);
    setPanelError(null);
    try {
      const res = await analysisApi.readme(activeRepoId);
      setReadme(res.markdown);
    } catch (e: any) {
      setPanelError(e?.message ?? "Failed to generate README.");
    } finally {
      setReadmeLoading(false);
    }
  };

  const handleCopyReadme = async () => {
    if (!readme) return;
    try {
      await navigator.clipboard.writeText(readme);
    } catch {
      setPanelError("Unable to copy README. Clipboard access was denied.");
    }
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
          <Button
            id="run-bugs-btn"
            style={{ width: "100%", marginBottom: "1rem" }}
            onClick={handleRunBugs}
            disabled={bugsLoading}
          >
            {bugsLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Scanning…</> : "Scan for Bugs"}
          </Button>
          {panelError && <p className="ap__hint" style={{ color: "var(--error)", marginBottom: "0.75rem" }}>{panelError}</p>}

          {bugs.length === 0 && !bugsLoading && (
            <p className="ap__hint">Run a scan to detect security issues and logic bugs.</p>
          )}

          {bugs.map((bug, i) => (
            <div key={i} className="bug-card glass">
              <div className="bug-card__header">
                <Badge variant={severityToVariant(bug.severity)}>
                  {bug.severity}
                </Badge>
                <span className="bug-card__file truncate">
                  {bug.file}:{bug.line_range}
                </span>
              </div>
              <p className="bug-card__desc">{bug.description}</p>
              <p className="bug-card__suggestion"><strong>Suggestion:</strong> {bug.suggestion}</p>
            </div>
          ))}
        </div>
      )}

      {/* README tab */}
      {sidebarTab === "readme" && (
        <div className="ap__body animate-fadeIn">
          <div style={{ display: "flex", gap: 6, marginBottom: "1rem" }}>
            <Button
              id="gen-readme-btn"
              style={{ flex: 1 }}
              onClick={handleGenReadme}
              disabled={readmeLoading}
            >
              {readmeLoading ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Generating…</> : "Generate README"}
            </Button>
            {readme && (
              <>
                <Button id="copy-readme-btn" variant="secondary" onClick={handleCopyReadme} title="Copy">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                </Button>
                <Button id="download-readme-btn" variant="secondary" onClick={handleDownloadReadme} title="Download">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                </Button>
              </>
            )}
          </div>
          {panelError && <p className="ap__hint" style={{ color: "var(--error)", marginBottom: "0.75rem" }}>{panelError}</p>}

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
        .ap { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-surface); }
        .ap__tabs {
          display: flex; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(17,17,20,0.8); flex-shrink: 0;
          backdrop-filter: blur(12px);
        }
        .ap__tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 12px 8px; font-size: 0.78rem; font-weight: 500;
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          transition: all var(--transition-fast);
          border-bottom: 2px solid transparent;
        }
        .ap__tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.02); }
        .ap__tab--active { color: var(--accent-2); border-bottom-color: var(--accent-1); }
        .ap__body { flex: 1; overflow-y: auto; padding: 1rem; }
        .ap__hint { font-size: 0.8rem; color: var(--text-muted); text-align: center; }
        .bug-card {
          padding: 12px 14px; margin-bottom: 8px;
          border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.06);
          background: var(--bg-elevated);
          transition: border-color var(--transition-fast);
        }
        .bug-card:hover { border-color: rgba(139,92,246,0.2); }
        .bug-card__header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .bug-card__file { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); }
        .bug-card__desc { font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 4px; }
        .bug-card__suggestion { font-size: 0.76rem; color: var(--text-muted); }
        .readme-preview {
          padding: 1rem; border-radius: var(--radius-sm);
          font-size: 0.82rem; line-height: 1.7; color: var(--text-secondary);
          overflow-y: auto; max-height: calc(100vh - 220px);
          background: var(--bg-elevated); border: 1px solid rgba(255,255,255,0.06);
        }
        .readme-preview :global(h1),
        .readme-preview :global(h2),
        .readme-preview :global(h3) { color: var(--text-primary); margin: 0.8em 0 0.4em; }
        .readme-preview :global(code) {
          font-family: var(--font-mono); font-size: 0.8em;
          background: rgba(139,92,246,0.12); color: var(--accent-2);
          padding: 1px 5px; border-radius: 4px;
        }
        .readme-preview :global(pre) { overflow-x: auto; }
        .readme-preview :global(a) { color: var(--accent-2); text-decoration: none; }
        .readme-preview :global(a:hover) { text-decoration: underline; }
        .readme-preview :global(hr) { border-color: rgba(255,255,255,0.06); }
      `}</style>
    </div>
  );
}
