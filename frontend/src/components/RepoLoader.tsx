"use client";

/**
 * components/RepoLoader.tsx — GitHub URL input + real-time ingestion progress.
 *
 * Shows step indicators: Cloning → Filtering → Chunking → Embedding → Ready
 */

import { useState } from "react";
import { repoApi, RepoStatusDetail } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import { useRepoStatus } from "@/hooks/useRepoStatus";

const STEPS = [
  { label: "Cloning repository", threshold: 20 },
  { label: "Filtering files",    threshold: 35 },
  { label: "Chunking code",      threshold: 55 },
  { label: "Generating embeddings", threshold: 90 },
  { label: "Building index",     threshold: 100 },
];

function currentStep(pct: number) {
  return STEPS.findIndex((s) => pct < s.threshold);
}

export default function RepoLoader() {
  const [url, setUrl]             = useState("");
  const [token, setToken]         = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const upsertRepo    = useChatStore((s) => s.upsertRepo);
  const repoStatus    = useChatStore((s) => s.repoStatus);
  const setActiveRepo = useChatStore((s) => s.setActiveRepo);

  const { startPolling } = useRepoStatus(pollingId);

  const status: RepoStatusDetail | undefined = pollingId
    ? repoStatus[pollingId]
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPollingId(null);

    if (!url.trim()) return;

    const isValidUrl =
      url.startsWith("https://") ||
      url.startsWith("git@") ||
      url.startsWith("http://");
    if (!isValidUrl) {
      setError("Please enter a valid GitHub HTTPS or SSH URL.");
      return;
    }

    setLoading(true);
    try {
      const { repo_id } = await repoApi.load(url.trim(), token || undefined);
      setPollingId(repo_id);
      startPolling(repo_id);
      upsertRepo({
        repo_id,
        name: url.split("/").pop()?.replace(".git", "") ?? "repository",
        url: url.trim(),
        status: "PENDING",
        chunk_count: 0,
        indexed_at: null,
      });
      setUrl("");
      setToken("");
    } catch (err: any) {
      setError(err.message ?? "Failed to load repository.");
    } finally {
      setLoading(false);
    }
  };

  const isIndexed = status?.status === "INDEXED";
  const isFailed  = status?.status === "FAILED";
  const pct       = status?.progress_percent ?? 0;
  const stepIdx   = currentStep(pct);

  return (
    <div className="repo-loader">
      <div className="repo-loader__header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icon-accent">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
          <path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
        <span>Load Repository</span>
      </div>

      <form onSubmit={handleSubmit} className="repo-loader__form">
        <input
          id="repo-url-input"
          className="input"
          type="text"
          placeholder="https://github.com/owner/repo"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          autoComplete="off"
        />

        <button
          type="button"
          className="btn-ghost btn"
          style={{ fontSize: "0.78rem", padding: "0.3rem 0.7rem" }}
          onClick={() => setShowToken((v) => !v)}
        >
          {showToken ? "Hide" : "Private repo? Add token"}
        </button>

        {showToken && (
          <input
            id="github-token-input"
            className="input"
            type="password"
            placeholder="GitHub Personal Access Token (optional)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        )}

        {error && (
          <p className="repo-loader__error">{error}</p>
        )}

        <button
          id="load-repo-btn"
          type="submit"
          className="btn btn-primary"
          disabled={loading || !url.trim()}
          style={{ width: "100%" }}
        >
          {loading ? (
            <><span className="spinner" style={{ width: 16, height: 16 }} /> Submitting…</>
          ) : (
            "Load & Index Repository"
          )}
        </button>
      </form>

      {/* Progress UI */}
      {pollingId && status && !isIndexed && !isFailed && (
        <div className="repo-loader__progress animate-fadeInUp">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {STEPS[Math.max(0, stepIdx)]?.label ?? "Finalising…"}
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--accent-3)", fontWeight: 600 }}>
              {pct}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar__fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="repo-loader__steps">
            {STEPS.map((step, i) => (
              <div
                key={step.label}
                className={`repo-loader__step ${
                  i < stepIdx
                    ? "done"
                    : i === stepIdx
                    ? "active"
                    : "pending"
                }`}
              >
                <span className="dot" />
                <span>{step.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isIndexed && (
        <div className="repo-loader__indexed animate-fadeInUp">
          <span>✓</span>
          <span>
            Indexed {status.file_count} files · {status.chunk_count} chunks
          </span>
          <button
            className="btn btn-primary"
            style={{ marginLeft: "auto", padding: "0.35rem 0.9rem", fontSize: "0.8rem" }}
            onClick={() => setActiveRepo(pollingId)}
          >
            Open Chat →
          </button>
        </div>
      )}

      {isFailed && (
        <div className="repo-loader__error-box">
          <span>✗ Ingestion failed</span>
          {status?.error_message && (
            <p style={{ fontSize: "0.78rem", marginTop: 4, color: "var(--text-muted)" }}>
              {status.error_message}
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        .repo-loader { padding: 1rem; }
        .repo-loader__header {
          display: flex; align-items: center; gap: 8px;
          font-weight: 600; font-size: 0.9rem;
          color: var(--text-primary); margin-bottom: 1rem;
        }
        .icon-accent { color: var(--accent-2); }
        .repo-loader__form { display: flex; flex-direction: column; gap: 8px; }
        .repo-loader__error { color: var(--error); font-size: 0.8rem; }
        .repo-loader__progress { margin-top: 1rem; }
        .repo-loader__steps {
          display: flex; flex-direction: column; gap: 4px; margin-top: 10px;
        }
        .repo-loader__step {
          display: flex; align-items: center; gap: 8px;
          font-size: 0.78rem; color: var(--text-muted); transition: color 0.3s;
        }
        .repo-loader__step.done { color: var(--success); }
        .repo-loader__step.active { color: var(--accent-3); }
        .repo-loader__step .dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: currentColor; flex-shrink: 0;
        }
        .repo-loader__step.active .dot {
          box-shadow: 0 0 6px var(--accent-2);
          animation: pulse-glow 1.5s ease-in-out infinite;
        }
        .repo-loader__indexed {
          display: flex; align-items: center; gap: 8px;
          margin-top: 1rem; padding: 10px 12px;
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.25);
          border-radius: var(--radius-sm);
          font-size: 0.82rem; color: var(--success);
        }
        .repo-loader__error-box {
          margin-top: 1rem; padding: 10px 12px;
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          border-radius: var(--radius-sm);
          font-size: 0.82rem; color: var(--error);
        }
      `}</style>
    </div>
  );
}
