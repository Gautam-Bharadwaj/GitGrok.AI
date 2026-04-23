"use client";

/**
 * components/AnalysisPanel.tsx — Sidebar with tabs for:
 *   1. Stats Dashboard (file count, chunk count, languages, top files)
 *   2. Bugs scan
 *   3. README generator
 *   4. File Explorer (tree view)
 *   5. Export chat
 */

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatStore } from "@/store/chatStore";
import { analysisApi, type RepoStatsResponse, type FileNode } from "@/lib/api";
import { Button } from "@/components/ui/button";

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
    { key: "stats", label: "Stats", icon: "📊" },
    { key: "bugs", label: "Bugs", icon: "🔍" },
    { key: "readme", label: "README", icon: "📄" },
    { key: "files", label: "Files", icon: "📁" },
    { key: "export", label: "Export", icon: "💾" },
  ];

  return (
    <div className="ap">
      {/* Tabs */}
      <div className="ap__tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`ap__tab ${tab === t.key ? "ap__tab--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="ap__body">
        {!activeRepoId && (
          <p className="ap__hint">Select a repo to view analysis</p>
        )}

        {/* ── Stats Tab ──────────────────────────────────── */}
        {activeRepoId && tab === "stats" && (
          <div className="animate-fadeIn">
            {statsLoading ? (
              <div className="ap__loading"><div className="spinner" /> Loading stats…</div>
            ) : stats ? (
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-card__value">{stats.file_count}</span>
                  <span className="stat-card__label">Files</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card__value">{stats.chunk_count}</span>
                  <span className="stat-card__label">Chunks</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card__value">{(stats.total_tokens / 1000).toFixed(1)}K</span>
                  <span className="stat-card__label">Tokens</span>
                </div>
                <div className="stat-card">
                  <span className="stat-card__value">{stats.avg_chunk_size.toFixed(0)}</span>
                  <span className="stat-card__label">Avg Chunk</span>
                </div>

                <div className="stat-section">
                  <h4 className="stat-section__title">Languages</h4>
                  {stats.languages.map((l) => (
                    <div key={l.language} className="lang-bar">
                      <div className="lang-bar__info">
                        <span className="lang-bar__name">{l.language}</span>
                        <span className="lang-bar__count">{l.count} ({l.percentage}%)</span>
                      </div>
                      <div className="lang-bar__track">
                        <div className="lang-bar__fill" style={{ width: `${l.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stat-section">
                  <h4 className="stat-section__title">Top Files</h4>
                  {stats.top_files.map((f) => (
                    <div key={f.file_path} className="top-file">
                      <span className="top-file__path truncate">{f.file_path}</span>
                      <span className="top-file__count">{f.chunk_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="ap__hint">No stats available</p>
            )}
          </div>
        )}

        {/* ── Bugs Tab ───────────────────────────────────── */}
        {activeRepoId && tab === "bugs" && (
          <div className="animate-fadeIn">
            <Button
              onClick={handleBugScan}
              disabled={bugsLoading}
              style={{ marginBottom: 12, width: "100%" }}
            >
              {bugsLoading ? <><div className="spinner" /> Scanning…</> : "🔍 Scan for Bugs"}
            </Button>
            {bugs.length === 0 && !bugsLoading && (
              <p className="ap__hint">No bugs found yet. Run a scan.</p>
            )}
            {bugs.map((bug, idx) => (
              <div key={idx} className="bug-card">
                <div className="bug-card__header">
                  <span className={`badge badge-${bug.severity.toLowerCase() === "critical" ? "critical" : bug.severity.toLowerCase() === "warning" ? "warning" : "info"}`}>
                    {bug.severity}
                  </span>
                  <span className="bug-card__file">{bug.file}:{bug.line_range}</span>
                </div>
                <p className="bug-card__desc">{bug.description}</p>
                <p className="bug-card__suggestion">💡 {bug.suggestion}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── README Tab ─────────────────────────────────── */}
        {activeRepoId && tab === "readme" && (
          <div className="animate-fadeIn">
            <Button
              onClick={handleReadme}
              disabled={readmeLoading}
              style={{ marginBottom: 12, width: "100%" }}
            >
              {readmeLoading ? <><div className="spinner" /> Generating…</> : "📄 Generate README"}
            </Button>
            {readme ? (
              <div className="readme-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
              </div>
            ) : (
              <p className="ap__hint">Click above to auto-generate a README</p>
            )}
          </div>
        )}

        {/* ── Files Tab ──────────────────────────────────── */}
        {activeRepoId && tab === "files" && (
          <div className="animate-fadeIn">
            {filesLoading ? (
              <div className="ap__loading"><div className="spinner" /> Loading files…</div>
            ) : files.length > 0 ? (
              <div className="file-tree">
                {files.map((node) => (
                  <FileTreeNode key={node.path} node={node} depth={0} />
                ))}
              </div>
            ) : (
              <p className="ap__hint">No files indexed</p>
            )}
          </div>
        )}

        {/* ── Export Tab ─────────────────────────────────── */}
        {activeRepoId && tab === "export" && (
          <div className="animate-fadeIn export-section">
            <h4 className="export-title">Export Conversation</h4>
            <p className="export-desc">Download or copy your current chat as markdown.</p>
            
            <Button onClick={handleExport} style={{ width: "100%", marginBottom: 8 }}>
              📥 Download as Markdown
            </Button>
            <Button variant="secondary" onClick={handleCopyChat} style={{ width: "100%" }}>
              {exportCopied ? "✅ Copied!" : "📋 Copy to Clipboard"}
            </Button>

            {messages.length > 0 && (
              <div className="export-stats">
                <span>{messages.length} messages</span>
                <span>·</span>
                <span>{messages.filter(m => m.role === "user").length} questions</span>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .ap { display: flex; flex-direction: column; height: 100%; overflow: hidden; background: var(--bg-surface); }
        .ap__tabs {
          display: flex; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(17,17,20,0.8); flex-shrink: 0;
          backdrop-filter: blur(12px); overflow-x: auto;
        }
        .ap__tab {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
          padding: 10px 4px; font-size: 0.72rem; font-weight: 500;
          background: none; border: none; color: var(--text-muted); cursor: pointer;
          transition: all var(--transition-fast);
          border-bottom: 2px solid transparent; white-space: nowrap;
        }
        .ap__tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.02); }
        .ap__tab--active { color: var(--accent-2); border-bottom-color: var(--accent-1); }
        .ap__body { flex: 1; overflow-y: auto; padding: 1rem; }
        .ap__hint { font-size: 0.82rem; color: var(--text-muted); text-align: center; padding: 2rem 0; }
        .ap__loading { display: flex; align-items: center; gap: 8px; justify-content: center; padding: 2rem 0; font-size: 0.82rem; color: var(--text-muted); }

        /* Stats */
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .stat-card {
          background: var(--bg-elevated); border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-sm); padding: 14px 12px; text-align: center;
          transition: border-color var(--transition-fast);
        }
        .stat-card:hover { border-color: rgba(139,92,246,0.25); }
        .stat-card__value { display: block; font-size: 1.4rem; font-weight: 800; color: var(--accent-2); }
        .stat-card__label { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-section { grid-column: 1 / -1; margin-top: 8px; }
        .stat-section__title { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
        .lang-bar { margin-bottom: 6px; }
        .lang-bar__info { display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 3px; }
        .lang-bar__name { color: var(--text-secondary); font-weight: 500; }
        .lang-bar__count { color: var(--text-muted); font-size: 0.72rem; }
        .lang-bar__track { height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
        .lang-bar__fill { height: 100%; background: linear-gradient(90deg, var(--accent-3), var(--accent-cyan)); border-radius: 2px; transition: width 0.5s ease; }
        .top-file { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 0.78rem; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .top-file__path { color: var(--text-secondary); font-family: var(--font-mono); font-size: 0.72rem; flex: 1; min-width: 0; }
        .top-file__count { color: var(--accent-2); font-weight: 600; flex-shrink: 0; margin-left: 8px; }

        /* Bugs */
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

        /* README */
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

        /* File tree */
        .file-tree { font-size: 0.82rem; }

        /* Export */
        .export-section { text-align: center; padding: 1rem 0; }
        .export-title { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
        .export-desc { font-size: 0.82rem; color: var(--text-muted); margin-bottom: 1.2rem; }
        .export-stats { display: flex; align-items: center; gap: 8px; justify-content: center; margin-top: 1rem; font-size: 0.75rem; color: var(--text-muted); }
      `}</style>
    </div>
  );
}


/* ── File Tree Node (recursive) ────────────────────────────────── */

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);

  return (
    <div>
      <div
        className="tree-node"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => node.is_dir && setOpen(!open)}
        role={node.is_dir ? "button" : undefined}
      >
        <span className="tree-node__icon">
          {node.is_dir ? (open ? "📂" : "📁") : "📄"}
        </span>
        <span className="tree-node__name">{node.name}</span>
        {node.chunk_count > 0 && (
          <span className="tree-node__count">{node.chunk_count}</span>
        )}
        {!node.is_dir && node.language && (
          <span className="tree-node__lang">{node.language}</span>
        )}
      </div>
      {node.is_dir && open && node.children.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
      <style jsx>{`
        .tree-node {
          display: flex; align-items: center; gap: 6px;
          padding: 4px 8px; cursor: pointer;
          border-radius: 4px; transition: background var(--transition-fast);
          font-size: 0.8rem;
        }
        .tree-node:hover { background: rgba(139,92,246,0.08); }
        .tree-node__icon { font-size: 0.85rem; flex-shrink: 0; }
        .tree-node__name { color: var(--text-secondary); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .tree-node__count { font-size: 0.68rem; color: var(--accent-2); font-weight: 600; background: rgba(139,92,246,0.1); padding: 1px 6px; border-radius: 99px; }
        .tree-node__lang { font-size: 0.65rem; color: var(--text-muted); font-family: var(--font-mono); }
      `}</style>
    </div>
  );
}
