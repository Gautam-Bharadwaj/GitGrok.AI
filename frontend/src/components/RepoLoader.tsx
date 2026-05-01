"use client";

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
          <div className="progress-area" style={{ marginTop: '16px' }}>
            <div className="progress-bar-bg" style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
              <div className="progress-bar-fill" style={{ width: `${loading ? 5 : pct}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
            </div>
            <span className="progress-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {loading ? "Connecting to repository..." : (STEPS[Math.max(0, stepIdx)]?.label ?? "Finalising…")} ({loading ? 5 : pct}%)
            </span>
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
