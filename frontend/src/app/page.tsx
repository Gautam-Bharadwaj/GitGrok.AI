"use client";

/**
 * app/page.tsx — Root page: Application shell with header, sidebar, chat, analysis.
 */

import { useState, useEffect } from "react";
import RepoLoader from "@/components/RepoLoader";
import ChatWindow from "@/components/ChatWindow";
import AnalysisPanel from "@/components/AnalysisPanel";
import HeroPage from "@/components/HeroPage";
import { useChatStore } from "@/store/chatStore";
import { repoApi } from "@/lib/api";

export default function HomePage() {
  const [hasEntered, setHasEntered] = useState(false);

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

  if (!hasEntered) {
    return <HeroPage onEnter={() => setHasEntered(true)} />;
  }

  return (
    <div className="app-shell gradient-bg">
      {/* ── Left sidebar ── */}
      <aside className="app-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
            <span className="sidebar-title">RepoMind</span>
          </div>
          <button className="btn-icon" onClick={() => setActiveRepo(null)} title="New Chat">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          <div style={{ padding: "0 0.75rem" }}>
            <RepoLoader />
          </div>
          
          <div className="sidebar-repos">
            <p className="sidebar-repos__label">Your Repositories</p>
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
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                    <path d="M9 18c-4.51 2-5-2-7-2"/>
                  </svg>
                </div>
                <div className="repo-item__info">
                  <p className="repo-item__name truncate">{repo.name}</p>
                </div>
                {repo.status !== "INDEXED" && (
                  <span className={`badge ${
                    repo.status === "FAILED" ? "badge-critical" : "badge-warning"
                  }`} style={{ fontSize: "0.6rem", padding: "1px 4px", marginRight: "4px" }}>
                    {repo.status.slice(0, 4)}
                  </span>
                )}
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
        </div>
        
        {/* User profile / settings mockup footprint */}
        <div className="sidebar-footer">
          <button
            className={`btn btn-ghost w-full justify-start ${analysisOpen ? "active" : ""}`}
            onClick={() => setAnalysisOpen(!analysisOpen)}
            style={{ width: "100%", justifyContent: "flex-start", border: "none" }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            System Analysis
          </button>
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
        .sidebar-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.25rem 1.5rem;
          background: #ffffff;
          border-bottom: 1px solid rgba(0,0,0,0.05);
        }
        .sidebar-brand {
          display: flex; align-items: center; gap: 10px;
          color: var(--accent-1);
        }
        .sidebar-title { font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }
        
        .sidebar-content { flex: 1; display: flex; flex-direction: column; overflow-y: hidden; }
        .sidebar-repos { padding: 1.5rem 1rem 1rem; flex: 1; overflow-y: auto; }
        .sidebar-repos__label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.75rem; padding: 0 8px; letter-spacing: 0.05em; }
        .sidebar-repos__empty { font-size: 0.85rem; color: var(--text-muted); padding: 0 8px; }

        .repo-item {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          border-radius: var(--radius-md); cursor: pointer;
          transition: all var(--transition-fast); margin-bottom: 4px;
          border: 1px solid transparent;
        }
        .repo-item:hover { background: var(--bg-glass-hover); border-color: rgba(0,0,0,0.05); }
        .repo-item--active { background: #f0fdf4; border-color: rgba(16,185,129,0.2); }
        .repo-item__icon {
          width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
          color: var(--text-muted); padding: 4px; border-radius: 6px; background: #f1f5f9;
        }
        .repo-item--active .repo-item__icon { color: #10b981; background: #dcfce7; }
        .repo-item__info { flex: 1; min-width: 0; }
        .repo-item__name { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
        .repo-item--active .repo-item__name { color: #065f46; font-weight: 600; }
        
        .repo-item__delete { opacity: 0; color: var(--text-muted); padding: 4px; }
        .repo-item:hover .repo-item__delete { opacity: 1; }
        .repo-item__delete:hover { color: var(--error) !important; background: rgba(239, 68, 68, 0.1); }
        
        .sidebar-footer {
          padding: 1rem; border-top: 1px solid rgba(0,0,0,0.05); background: #ffffff;
        }

        .analysis-sidebar {
          width: 380px; border-left: 1px solid rgba(0,0,0,0.08);
          overflow: hidden; display: flex; flex-direction: column;
          background: var(--bg-surface);
        }

        /* Update grid to remove top header row completely */
        :global(.app-shell) {
          grid-template-rows: 1fr;
          grid-template-areas: "sidebar main";
          background: var(--bg-base);
        }
        :global(.app-shell):has(.analysis-sidebar) {
          grid-template-columns: var(--sidebar-width) 1fr 380px;
          grid-template-areas: "sidebar main analysis";
        }
      `}</style>
    </div>
  );
}
