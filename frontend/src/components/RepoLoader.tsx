"use client";

import { useState } from "react";
import { repoApi, RepoStatusDetail } from "@/lib/api";
import { useChatStore } from "@/store/chatStore";
import { useRepoStatus } from "@/hooks/useRepoStatus";

const STEPS = [
  { label: "Cloning repository...", threshold: 20 },
  { label: "Filtering binary files...",    threshold: 35 },
  { label: "Chunking source code...",      threshold: 55 },
  { label: "Generating embeddings (Vectorize)...", threshold: 90 },
  { label: "Finalizing knowledge base...",     threshold: 100 },
];

const MOCK_FILES = [
  "package.json", "src/index.ts", "lib/router.js", "README.md", 
  "app/page.tsx", "utils/logger.ts", "config/db.json", "tests/core.spec.js"
];

function currentStep(pct: number) {
  return STEPS.findIndex((s) => pct < s.threshold);
}

export default function RepoLoader() {
  const [url, setUrl]             = useState("");
  const [token, setToken]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  const upsertRepo    = useChatStore((s) => s.upsertRepo);
  const repoStatus    = useChatStore((s) => s.repoStatus);

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
    <div className="sync-grid">
      <div className="card sync-control">
        <h3>Connection</h3>
        <p>Add a GitHub Personal Access Token for private repositories (Optional).</p>
        <div className="input-field" style={{ marginTop: 16 }}>
          <input 
            type="password" 
            placeholder="GitHub Token" 
            value={token} 
            onChange={(e) => setToken(e.target.value)} 
          />
        </div>
      </div>

      <div className="card sync-action">
        <h3>Synchronize</h3>
        <p>Index your GitHub repository to access code.</p>
        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="input-field">
            <input 
              type="text" 
              placeholder="https://github.com/owner/repo" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
              disabled={loading} 
            />
          </div>
          <button type="submit" className="btn-secondary" disabled={loading || !url.trim()}>
            {loading ? "Submitting..." : "Start Sync"}
          </button>
        </form>

        {error && <p style={{ color: 'var(--danger)', marginTop: 16, fontSize: '0.85rem' }}>{error}</p>}

        {(loading || (pollingId && !isIndexed && !isFailed)) && (
          <div className="progress-area" style={{ marginTop: '24px' }}>
            <div className="progress-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span className="step-text" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {loading ? "Establishing connection..." : (STEPS[Math.max(0, stepIdx)]?.label ?? "Finalising…")}
              </span>
              <span className="pct-text" style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700 }}>
                {loading ? 5 : pct}%
              </span>
            </div>
            
            <div className="progress-bar-bg" style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
              <div 
                className="progress-bar-fill glow-progress" 
                style={{ 
                  width: `${loading ? 5 : pct}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, var(--primary-dark), var(--primary))', 
                  transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '10px'
                }}
              ></div>
            </div>

            {!loading && pct > 20 && (
              <div className="file-ticker animate-fadeIn" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="pulse-dot"></div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  Processing: {MOCK_FILES[Math.floor((pct / 100) * MOCK_FILES.length) % MOCK_FILES.length]}
                </span>
              </div>
            )}
          </div>
        )}

        {isIndexed && (
          <p style={{ color: 'var(--success)', marginTop: 16, fontSize: '0.85rem' }}>
            Indexed {status.file_count} files · {status.chunk_count} chunks
          </p>
        )}

        {isFailed && (
          <p style={{ color: 'var(--danger)', marginTop: 16, fontSize: '0.85rem' }}>
            Ingestion failed: {status.error_message}
          </p>
        )}
      </div>
    </div>
  );
}
