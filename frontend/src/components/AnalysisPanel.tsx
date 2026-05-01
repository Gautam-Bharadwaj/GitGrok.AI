"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore } from "@/store/chatStore";
import { analysisApi, type RepoStatsResponse, type FileNode } from "@/lib/api";

type Tab = "stats" | "bugs" | "readme" | "files" | "export";

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
  const messages = useChatStore((s) => s.messages);

  const [tab, setTab] = useState<Tab>("stats");
  const [stats, setStats] = useState<RepoStatsResponse | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [files, setFiles] = useState<FileNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [exportCopied, setExportCopied] = useState(false);

  // Load stats when tab is active and repo is selected
  useEffect(() => {
    if (tab === "stats" && activeRepoId && !stats) {
      setStatsLoading(true);
      analysisApi
        .stats(activeRepoId)
        .then(setStats)
        .catch(() => {})
        .finally(() => setStatsLoading(false));
    }
  }, [tab, activeRepoId, stats]);

  // Load file tree when tab is active
  useEffect(() => {
    if (tab === "files" && activeRepoId && files.length === 0) {
      setFilesLoading(true);
      analysisApi
        .files(activeRepoId)
        .then(setFiles)
        .catch(() => {})
        .finally(() => setFilesLoading(false));
    }
  }, [tab, activeRepoId, files.length]);

  // Reset on repo change
  useEffect(() => {
    setStats(null);
    setFiles([]);
  }, [activeRepoId]);

  const handleBugScan = async () => {
    if (!activeRepoId || bugsLoading) return;
    setBugsLoading(true);
    try {
      const res = await analysisApi.bugs(activeRepoId);
      setBugs(res.findings);
    } catch {
      setBugs([]);
    }
    setBugsLoading(false);
  };

  const handleReadme = async () => {
    if (!activeRepoId || readmeLoading) return;
    setReadmeLoading(true);
    try {
      const res = await analysisApi.readme(activeRepoId);
      setReadme(res.markdown);
    } catch {
      setReadme("Failed to generate README.");
    }
    setReadmeLoading(false);
  };

  const handleExport = () => {
    const md = messages
      .map((m) => {
        const role = m.role === "user" ? "**You**" : "**GitGrok.AI**";
        return `### ${role}\n${m.content}`;
      })
      .join("\n\n---\n\n");
    
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitgrok-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyChat = () => {
    const text = messages
      .map((m) => `${m.role === "user" ? "You" : "GitGrok.AI"}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const TABS: { key: Tab; label: string; icon: string }[] = [
    { key: "stats", label: "Stats", icon: "" },
    { key: "bugs", label: "Bugs", icon: "" },
    { key: "readme", label: "README", icon: "" },
    { key: "files", label: "Files", icon: "" },
    { key: "export", label: "Export", icon: "" },
  ];

  return (
    <>
      <div className="analysis-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.2)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
            style={{ flex: 1, padding: '12px 0', background: 'transparent', border: 'none', color: tab === t.key ? 'var(--primary)' : 'var(--text-muted)', borderBottom: tab === t.key ? '2px solid var(--primary)' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.3s' }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="analysis-content" style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
        {!activeRepoId && (
          <div className="empty-state">
            <p>Select a repository to view analysis</p>
          </div>
        )}

        {/* ── Stats Tab ──────────────────────────────────── */}
        {activeRepoId && tab === "stats" && (
          <div className="animate-fadeIn">
            {statsLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading stats…</div>
            ) : stats ? (
              <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="stat-card" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>{stats.file_count}</div>
                  <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Files</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>{stats.chunk_count}</div>
                  <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chunks</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>{(stats.total_tokens / 1000).toFixed(1)}K</div>
                  <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tokens</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', textAlign: 'center' }}>
                  <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)' }}>{stats.avg_chunk_size.toFixed(0)}</div>
                  <div className="stat-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Avg Chunk</div>
                </div>

                <div className="stat-section" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '12px' }}>Languages</h4>
                  {stats.languages.map((l) => (
                    <div key={l.language} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text)' }}>{l.language}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{l.count} ({l.percentage}%)</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--primary)', width: `${l.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stat-section" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <h4 style={{ color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px', marginBottom: '12px' }}>Top Files</h4>
                  {stats.top_files.map((f) => (
                    <div key={f.file_path} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.file_path}</span>
                      <span style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '12px' }}>{f.chunk_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="empty-state"><p>No stats available</p></div>
            )}
          </div>
        )}

        {/* ── Bugs Tab ───────────────────────────────────── */}
        {activeRepoId && tab === "bugs" && (
          <div className="animate-fadeIn">
            <button
              className="btn-secondary"
              onClick={handleBugScan}
              disabled={bugsLoading}
              style={{ width: "100%", marginBottom: '16px' }}
            >
              {bugsLoading ? "Scanning…" : "Scan for Bugs"}
            </button>
            {bugs.length === 0 && !bugsLoading && (
              <div className="empty-state"><p>No bugs found yet. Run a scan.</p></div>
            )}
            {bugs.map((bug, idx) => (
              <div key={idx} style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: bug.severity.toLowerCase() === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)', color: bug.severity.toLowerCase() === 'critical' ? '#fca5a5' : '#fcd34d' }}>
                    {bug.severity}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{bug.file}:{bug.line_range}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', marginBottom: '8px' }}>{bug.description}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Suggestion: {bug.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── README Tab ─────────────────────────────────── */}
        {activeRepoId && tab === "readme" && (
          <div className="animate-fadeIn">
            <button
              className="btn-secondary"
              onClick={handleReadme}
              disabled={readmeLoading}
              style={{ width: "100%", marginBottom: '16px' }}
            >
              {readmeLoading ? "Generating…" : "Generate README"}
            </button>
            {readme ? (
              <div style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', borderRadius: '8px', padding: '20px', fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, overflowY: 'auto', maxHeight: '500px' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
              </div>
            ) : (
              <div className="empty-state"><p>Click above to auto-generate a README</p></div>
            )}
          </div>
        )}

        {/* ── Files Tab ──────────────────────────────────── */}
        {activeRepoId && tab === "files" && (
          <div className="animate-fadeIn">
            {filesLoading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Loading files…</div>
            ) : files.length > 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                {files.map((node) => (
                  <FileTreeNode key={node.path} node={node} depth={0} />
                ))}
              </div>
            ) : (
              <div className="empty-state"><p>No files indexed</p></div>
            )}
          </div>
        )}

        {/* ── Export Tab ─────────────────────────────────── */}
        {activeRepoId && tab === "export" && (
          <div className="animate-fadeIn" style={{ textAlign: 'center', padding: '2rem 0' }}>
            <h4 style={{ fontSize: '1.2rem', color: 'var(--text)', marginBottom: '8px' }}>Export Conversation</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '24px' }}>Download or copy your current chat as markdown.</p>
            
            <button className="btn-primary" onClick={handleExport} style={{ width: "100%", marginBottom: '12px' }}>
              Download as Markdown
            </button>
            <button className="btn-secondary" onClick={handleCopyChat} style={{ width: "100%" }}>
              {exportCopied ? "Copied!" : "Copy to Clipboard"}
            </button>

            {messages.length > 0 && (
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <span>{messages.length} messages</span>
                <span>·</span>
                <span>{messages.filter(m => m.role === "user").length} questions</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ── File Tree Node (recursive) ────────────────────────────────── */

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', paddingLeft: `${depth * 16 + 8}px`, cursor: 'pointer', borderRadius: '4px', transition: 'background 0.2s', background: 'transparent' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        onClick={() => node.is_dir && setOpen(!open)}
        role={node.is_dir ? "button" : undefined}
      >
        <span style={{ color: 'var(--primary)', width: '16px', textAlign: 'center' }}>
          {node.is_dir ? (open ? "−" : "+") : "•"}
        </span>
        <span style={{ color: 'var(--text)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</span>
        {node.chunk_count > 0 && (
          <span style={{ fontSize: '0.7rem', color: 'var(--primary)', background: 'var(--primary-glow)', padding: '2px 6px', borderRadius: '10px' }}>{node.chunk_count}</span>
        )}
        {!node.is_dir && node.language && (
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{node.language}</span>
        )}
      </div>
      {node.is_dir && open && node.children.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}
