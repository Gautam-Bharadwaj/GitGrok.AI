"use client";

/**
 * app/page.tsx — Root page: Application shell with header, sidebar, chat, analysis.
 */

import { useEffect } from "react";
import RepoLoader from "@/components/RepoLoader";
import ChatWindow from "@/components/ChatWindow";
import AnalysisPanel from "@/components/AnalysisPanel";
import { useChatStore } from "@/store/chatStore";
import { repoApi } from "@/lib/api";

export default function HomePage() {
  const repos        = useChatStore((s) => s.repos);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  const setRepos     = useChatStore((s) => s.setRepos);
  const setActiveRepo = useChatStore((s) => s.setActiveRepo);
  const removeRepo   = useChatStore((s) => s.removeRepo);
  const analysisOpen = useChatStore((s) => s.analysisOpen);
  const setAnalysisOpen = useChatStore((s) => s.setAnalysisOpen);

  // Load repo list on mount
  useEffect(() => {
    repoApi.list().then(setRepos).catch(console.error);
  }, [setRepos]);

  const handleDeleteRepo = async (id: string) => {
    await repoApi.delete(id);
    removeRepo(id);
    if (activeRepoId === id) setActiveRepo(null);
  };

  return (
    <div className="app-shell gradient-bg">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
          </div>
          <span className="header-title">RepoMind</span>
          <span className="badge badge-success" style={{ marginLeft: 8 }}>v1.0</span>
        </div>

        <div className="header-actions">
          <button
            id="toggle-analysis-btn"
            className={`btn btn-ghost ${analysisOpen ? "active" : ""}`}
            onClick={() => setAnalysisOpen(!analysisOpen)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            Analysis
          </button>
        </div>
      </header>

      {/* ── Left sidebar ── */}
      <aside className="app-sidebar">
        <RepoLoader />
        <div className="divider" style={{ margin: "0 1rem" }} />

        {/* Repo list */}
        <div className="sidebar-repos">
          <p className="sidebar-repos__label">Indexed Repositories</p>
          {repos.length === 0 && (
            <p className="sidebar-repos__empty">No repositories yet.</p>
          )}
          {repos.map((repo) => (
            <div
              key={repo.repo_id}
              id={`repo-item-${repo.repo_id}`}
              className={`repo-item ${activeRepoId === repo.repo_id ? "repo-item--active" : ""}`}
              onClick={() => repo.status === "INDEXED" && setActiveRepo(repo.repo_id)}
            >
              <div className="repo-item__icon">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
              </div>
              <div className="repo-item__info">
                <p className="repo-item__name truncate">{repo.name}</p>
                <p className="repo-item__meta">
                  <span className={`badge ${
                    repo.status === "INDEXED"    ? "badge-success" :
                    repo.status === "FAILED"     ? "badge-critical" :
                    repo.status === "PROCESSING" ? "badge-warning" : "badge-info"
                  }`} style={{ fontSize: "0.64rem", padding: "1px 5px" }}>
                    {repo.status}
                  </span>
                  {repo.chunk_count > 0 && (
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginLeft: 4 }}>
                      {repo.chunk_count} chunks
                    </span>
                  )}
                </p>
              </div>
              <button
                className="btn-icon repo-item__delete"
                title="Delete repository"
                onClick={(e) => { e.stopPropagation(); handleDeleteRepo(repo.repo_id); }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main (chat) ── */}
      <main className="app-main">
        <ChatWindow />
      </main>

      {/* ── Right analysis panel (toggleable) ── */}
      {analysisOpen && (
        <aside className="analysis-sidebar animate-fadeIn">
          <AnalysisPanel />
        </aside>
      )}

      <style jsx>{`
        .header-brand { display: flex; align-items: center; gap: 10px; }
        .header-logo {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, var(--accent-1), var(--accent-2));
          color: #fff; box-shadow: 0 0 16px var(--accent-glow);
        }
        .header-title { font-weight: 700; font-size: 0.95rem; letter-spacing: -0.01em; }
        .header-actions { display: flex; align-items: center; gap: 8px; }
        .header-actions .btn.active {
          background: rgba(124,58,237,0.15);
          border-color: rgba(124,58,237,0.3);
          color: var(--accent-3);
        }

        .sidebar-repos { padding: 0.75rem 0.75rem 1rem; flex: 1; overflow-y: auto; }
        .sidebar-repos__label { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; padding: 0 4px; }
        .sidebar-repos__empty { font-size: 0.8rem; color: var(--text-muted); padding: 4px; }

        .repo-item {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          border-radius: var(--radius-sm); cursor: pointer;
          transition: all var(--transition-fast); margin-bottom: 4px;
          border: 1px solid transparent;
        }
        .repo-item:hover { background: var(--bg-glass); border-color: rgba(255,255,255,0.06); }
        .repo-item--active {
          background: rgba(124,58,237,0.1);
          border-color: rgba(124,58,237,0.25);
        }
        .repo-item__icon {
          width: 28px; height: 28px; border-radius: 6px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-elevated); color: var(--text-muted);
        }
        .repo-item--active .repo-item__icon { color: var(--accent-2); }
        .repo-item__info { flex: 1; min-width: 0; }
        .repo-item__name { font-size: 0.82rem; font-weight: 500; color: var(--text-primary); }
        .repo-item__meta { display: flex; align-items: center; margin-top: 2px; }
        .repo-item__delete { opacity: 0; color: var(--text-muted); padding: 4px; }
        .repo-item:hover .repo-item__delete { opacity: 1; }
        .repo-item__delete:hover { color: var(--error) !important; }

        .analysis-sidebar {
          width: 380px; border-left: 1px solid rgba(255,255,255,0.06);
          overflow: hidden; display: flex; flex-direction: column;
          background: var(--bg-surface);
          grid-row: 2; grid-column: 3;
        }

        /* Extend grid to accommodate optional analysis panel */
        :global(.app-shell) {
          grid-template-columns: var(--sidebar-width) 1fr;
        }
        :global(.app-shell):has(.analysis-sidebar) {
          grid-template-columns: var(--sidebar-width) 1fr 380px;
        }
      `}</style>
    </div>
  );
}
