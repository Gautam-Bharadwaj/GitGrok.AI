"use client";

/**
 * app/page.tsx — Root page: Application shell with header, sidebar, chat, analysis.
 */

import { useState, useEffect } from "react";
import RepoLoader from "@/components/RepoLoader";
import ChatWindow from "@/components/ChatWindow";
import AnalysisPanel from "@/components/AnalysisPanel";
import { useChatStore } from "@/store/chatStore";
import { repoApi } from "@/lib/api";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const repos        = useChatStore((s) => s.repos);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  const setRepos     = useChatStore((s) => s.setRepos);
  const setActiveRepo = useChatStore((s) => s.setActiveRepo);
  const removeRepo   = useChatStore((s) => s.removeRepo);
  const analysisOpen = useChatStore((s) => s.analysisOpen);
  const setAnalysisOpen = useChatStore((s) => s.setAnalysisOpen);
  const [repoError, setRepoError] = useState<string | null>(null);

  // Load repo list on mount
  useEffect(() => {
    repoApi
      .list()
      .then((list) => {
        setRepos(list);
        setRepoError(null);
      })
      .catch((err: Error) => {
        setRepoError(err.message || "Failed to load repositories.");
      });
  }, [setRepos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setActiveRepo(null);
      }
      if (mod && e.key === "b") {
        e.preventDefault();
        setAnalysisOpen(!analysisOpen);
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        document.getElementById("chat-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveRepo, setAnalysisOpen, analysisOpen]);

  const handleDeleteRepo = async (id: string) => {
    try {
      await repoApi.delete(id);
      removeRepo(id);
      if (activeRepoId === id) setActiveRepo(null);
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Failed to delete repository.");
    }
  };

  return (
    <div className="workspace gradient-bg">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
              <path d="M9 18c-4.51 2-5-2-7-2"/>
            </svg>
          </span>
          <span className="brand-text">GitGrok<span className="brand-dot">.AI</span></span>
        </div>
        <div className="topbar-actions">
          <Button variant="secondary" onClick={() => setActiveRepo(null)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Chat
          </Button>
          <Button variant={analysisOpen ? "default" : "secondary"} onClick={() => setAnalysisOpen(!analysisOpen)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Analysis
          </Button>
        </div>
      </header>

      <section className="repo-control glass">
        <div className="repo-control__loader">
          <RepoLoader />
        </div>
        <div className="repo-control__list">
          <p className="repo-control__label">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.5}}>
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            Repositories
          </p>
          {repoError && <p className="repo-control__error">{repoError}</p>}
          <div className="repo-pills">
            {repos.length === 0 && <p className="repo-control__empty">No repositories indexed yet. Add one above.</p>}
            {repos.map((repo) => (
              <div
                key={repo.repo_id}
                className={`repo-pill ${activeRepoId === repo.repo_id ? "repo-pill--active" : ""}`}
                onClick={() => repo.status === "INDEXED" && setActiveRepo(repo.repo_id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && repo.status === "INDEXED") setActiveRepo(repo.repo_id);
                }}
              >
                <span className="repo-pill__dot" />
                <span className="truncate">{repo.name}</span>
                {repo.status !== "INDEXED" && (
                  <span className={`badge ${repo.status === "FAILED" ? "badge-critical" : "badge-warning"}`}>
                    {repo.status.slice(0, 4)}
                  </span>
                )}
                <button
                  className="repo-pill__delete"
                  title="Delete repository"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRepo(repo.repo_id);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <main className={`chat-zone ${analysisOpen ? "chat-zone--with-analysis" : ""}`}>
        <div className="chat-shell">
          <ChatWindow />
        </div>
        {analysisOpen && (
          <section className="analysis-sidebar animate-fadeIn">
            <AnalysisPanel />
          </section>
        )}
      </main>

      <style jsx>{`
        .workspace {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-base);
          position: relative;
          z-index: 1;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1.25rem;
          height: var(--header-height);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          background: rgba(9, 9, 11, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--accent-3), var(--accent-1));
          color: #fff;
          box-shadow: 0 0 20px var(--accent-glow);
        }
        .brand-text {
          font-size: 1.2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .brand-dot {
          background: linear-gradient(135deg, var(--accent-1), var(--accent-cyan));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .topbar-actions {
          display: flex;
          gap: 8px;
        }
        .repo-control {
          margin: 0.75rem 1rem;
          padding: 0.75rem;
          display: grid;
          grid-template-columns: minmax(280px, 360px) 1fr;
          gap: 1rem;
          align-items: start;
          position: relative;
          z-index: 1;
        }
        .repo-control__list {
          min-width: 0;
        }
        .repo-control__label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .repo-control__error { color: var(--error); font-size: 0.82rem; margin-bottom: 0.5rem; }
        .repo-control__empty { color: var(--text-muted); font-size: 0.82rem; padding: 0.3rem 0.2rem; }
        .repo-pills {
          display: flex;
          gap: 0.5rem;
          overflow-x: auto;
          padding-bottom: 0.35rem;
        }
        .repo-pill {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: var(--bg-elevated);
          border-radius: 999px;
          padding: 0.42rem 0.7rem;
          max-width: 220px;
          cursor: pointer;
          font-size: 0.82rem;
          color: var(--text-secondary);
          transition: all var(--transition-fast);
        }
        .repo-pill:hover {
          border-color: rgba(139,92,246,0.3);
          background: rgba(139,92,246,0.08);
          color: var(--text-primary);
        }
        .repo-pill--active {
          border-color: rgba(52, 211, 153, 0.3);
          background: rgba(52, 211, 153, 0.08);
          color: var(--success);
        }
        .repo-pill__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--text-muted);
          flex-shrink: 0;
        }
        .repo-pill--active .repo-pill__dot {
          background: var(--success);
          box-shadow: 0 0 8px rgba(52, 211, 153, 0.5);
        }
        .repo-pill__delete {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
          padding: 0 0.2rem;
          transition: color var(--transition-fast);
        }
        .repo-pill__delete:hover {
          color: var(--error);
        }
        .chat-zone {
          flex: 1;
          min-height: 0;
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: row;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }
        .chat-shell {
          flex: 1;
          min-height: 0;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: var(--bg-surface);
        }
        .analysis-sidebar {
          flex: 0 0 360px;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.06);
          background: var(--bg-surface);
          animation: slideInRight 0.24s ease-out;
        }
        .chat-zone--with-analysis .chat-shell {
          min-width: 0;
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 900px) {
          .repo-control {
            grid-template-columns: 1fr;
          }
          .chat-zone {
            flex-direction: column;
          }
          .analysis-sidebar {
            flex-basis: 280px;
          }
        }
      `}</style>
    </div>
  );
}
