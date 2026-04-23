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
        <div className="brand">GitGrok.AI</div>
        <div className="topbar-actions">
          <Button variant="secondary" onClick={() => setActiveRepo(null)}>
            New Chat
          </Button>
          <Button variant={analysisOpen ? "default" : "secondary"} onClick={() => setAnalysisOpen(!analysisOpen)}>
            System Analysis
          </Button>
        </div>
      </header>

      <section className="repo-control glass">
        <div className="repo-control__loader">
          <RepoLoader />
        </div>
        <div className="repo-control__list">
          <p className="repo-control__label">Repositories</p>
          {repoError && <p className="repo-control__error">{repoError}</p>}
          <div className="repo-pills">
            {repos.length === 0 && <p className="repo-control__empty">No repositories yet.</p>}
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
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
          position: sticky;
          top: 0;
          z-index: 20;
        }
        .brand {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .topbar-actions {
          display: flex;
          gap: 8px;
        }
        .repo-control {
          margin: 1rem;
          padding: 0.75rem;
          display: grid;
          grid-template-columns: minmax(280px, 360px) 1fr;
          gap: 1rem;
          align-items: start;
        }
        .repo-control__list {
          min-width: 0;
        }
        .repo-control__label {
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: 0.5rem;
          font-weight: 700;
        }
        .repo-control__error { color: var(--error); font-size: 0.82rem; margin-bottom: 0.5rem; }
        .repo-control__empty { color: var(--text-muted); font-size: 0.85rem; padding: 0.3rem 0.2rem; }
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
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
          border-radius: 999px;
          padding: 0.42rem 0.7rem;
          max-width: 220px;
          cursor: pointer;
        }
        .repo-pill--active {
          border-color: rgba(16, 185, 129, 0.3);
          background: #ecfdf5;
        }
        .repo-pill__delete {
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          font-size: 1rem;
          line-height: 1;
          padding: 0 0.2rem;
        }
        .chat-zone {
          flex: 1;
          min-height: 0;
          padding: 0 1rem 1rem;
          display: flex;
          flex-direction: row;
          gap: 1rem;
        }
        .chat-shell {
          flex: 1;
          min-height: 0;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: #fff;
        }
        .analysis-sidebar {
          flex: 0 0 360px;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(0, 0, 0, 0.08);
          background: #fff;
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
