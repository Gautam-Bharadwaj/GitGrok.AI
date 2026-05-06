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

  useEffect(() => {
    if (tab === "stats" && activeRepoId && !stats) {
      setStatsLoading(true);
      analysisApi.stats(activeRepoId).then(setStats).catch(() => {}).finally(() => setStatsLoading(false));
    }
  }, [tab, activeRepoId, stats]);

  useEffect(() => {
    if (tab === "files" && activeRepoId && files.length === 0) {
      setFilesLoading(true);
      analysisApi.files(activeRepoId).then(setFiles).catch(() => {}).finally(() => setFilesLoading(false));
    }
  }, [tab, activeRepoId, files.length]);

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
    const md = messages.map(m => `### ${m.role === "user" ? "**You**" : "**GitGrok.AI**"}\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gitgrok-chat-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyChat = () => {
    const text = messages.map(m => `${m.role === "user" ? "You" : "GitGrok.AI"}: ${m.content}`).join("\n\n");
    navigator.clipboard.writeText(text);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "stats", label: "Insights", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg> },
    { key: "bugs", label: "Bugs", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg> },
    { key: "readme", label: "Docs", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20M4 19.5V5A2.5 2.5 0 0 1 6.5 2.5H20v14.5H6.5A2.5 2.5 0 0 0 4 19.5z"/></svg> },
    { key: "files", label: "Files", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
    { key: "export", label: "Export", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> },
  ];

  return (
    <>
      <div className="analysis-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="analysis-content scroll-custom">
        {!activeRepoId && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="var(--text-muted)" strokeWidth="1" style={{ marginBottom: 16 }}>
              <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <p>Select a repository in Step 2 to begin analysis</p>
          </div>
        )}

        {activeRepoId && tab === "stats" && (
          <div className="animate-fadeIn">
            {statsLoading ? (
              <div className="panel-loading"><div className="spinner-sm"></div> Calculating insights...</div>
            ) : stats ? (
              <div className="stats-dashboard">
                <div className="health-card">
                  <div className="health-score">
                    <svg viewBox="0 0 36 36" className="circular-chart orange">
                      <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path className="circle" strokeDasharray="85, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <text x="18" y="20.35" className="percentage">85%</text>
                    </svg>
                    <div className="health-info">
                      <strong>Repo Health</strong>
                      <span>Solid Architecture</span>
                    </div>
                  </div>
                </div>

                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="m-label">Files</span>
                    <span className="m-value">{stats.file_count}</span>
                  </div>
                  <div className="metric-item">
                    <span className="m-label">Chunks</span>
                    <span className="m-value">{stats.chunk_count}</span>
                  </div>
                  <div className="metric-item">
                    <span className="m-label">Total Tokens</span>
                    <span className="m-value">{(stats.total_tokens / 1000).toFixed(1)}K</span>
                  </div>
                </div>

                <div className="stat-section">
                  <header>Languages</header>
                  {stats.languages.map((l) => (
                    <div key={l.language} className="lang-row">
                      <div className="lang-info">
                        <span>{l.language}</span>
                        <span className="muted">{l.percentage}%</span>
                      </div>
                      <div className="progress-mini">
                        <div className="fill" style={{ width: `${l.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="stat-section">
                  <header>Complex Files</header>
                  {stats.top_files.map((f) => (
                    <div key={f.file_path} className="file-row">
                      <span className="truncate">{f.file_path}</span>
                      <span className="badge">{f.chunk_count} units</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {activeRepoId && tab === "bugs" && (
          <div className="animate-fadeIn">
            <button className="btn-secondary w-full mb-4" onClick={handleBugScan} disabled={bugsLoading}>
              {bugsLoading ? "Deep Scanning..." : "Run Security Audit"}
            </button>
            {bugs.length === 0 && !bugsLoading && <div className="empty-state"><p>No vulnerabilities found yet.</p></div>}
            {bugs.map((bug, idx) => (
              <div key={idx} className="bug-card">
                <div className="bug-header">
                  <span className={`severity ${bug.severity.toLowerCase()}`}>{bug.severity}</span>
                  <span className="file-link truncate">{bug.file}:{bug.line_range}</span>
                </div>
                <p className="description">{bug.description}</p>
                <div className="suggestion"><strong>Fix:</strong> {bug.suggestion}</div>
              </div>
            ))}
          </div>
        )}

        {activeRepoId && tab === "readme" && (
          <div className="animate-fadeIn">
            <button className="btn-secondary w-full mb-4" onClick={handleReadme} disabled={readmeLoading}>
              {readmeLoading ? "Drafting..." : "Auto-Generate Docs"}
            </button>
            {readme ? (
              <div className="markdown-viewer">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{readme}</ReactMarkdown>
              </div>
            ) : <div className="empty-state"><p>Use AI to document your repository.</p></div>}
          </div>
        )}

        {activeRepoId && tab === "files" && (
          <div className="animate-fadeIn">
            {filesLoading ? <div className="panel-loading">Building tree...</div> : (
              <div className="file-tree">
                {files.map((node) => <FileTreeNode key={node.path} node={node} depth={0} />)}
              </div>
            )}
          </div>
        )}

        {activeRepoId && tab === "export" && (
          <div className="animate-fadeIn export-view">
            <h3>Knowledge Export</h3>
            <p>Archive this session for your technical documentation.</p>
            <div className="export-actions">
              <button className="btn-primary" onClick={handleExport}>Download MD</button>
              <button className="btn-secondary" onClick={handleCopyChat}>{exportCopied ? "Copied!" : "Copy Text"}</button>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .analysis-tabs { display: flex; border-bottom: 1px solid var(--border); background: rgba(0,0,0,0.3); }
        .tab-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 0; background: transparent; border: none; color: var(--text-muted); border-bottom: 2px solid transparent; cursor: pointer; transition: 0.3s; font-size: 0.85rem; font-weight: 600; }
        .tab-btn:hover { color: var(--text); background: rgba(255,255,255,0.02); }
        .tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: rgba(255,102,0,0.03); }
        
        .analysis-content { padding: 24px; flex: 1; overflow-y: auto; }
        .scroll-custom::-webkit-scrollbar { width: 4px; }
        .scroll-custom::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
        
        .stats-dashboard { display: flex; flex-direction: column; gap: 20px; }
        .health-card { background: var(--primary-glow); border: 1px solid var(--border-active); border-radius: var(--radius-md); padding: 20px; }
        .health-score { display: flex; align-items: center; gap: 20px; }
        .circular-chart { width: 60px; height: 60px; }
        .circle-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 3.8; }
        .circle { fill: none; stroke-width: 3.8; stroke-linecap: round; stroke: var(--primary); animation: progress 1s ease-out forwards; }
        .percentage { fill: #fff; font-family: sans-serif; font-size: 0.5rem; text-anchor: middle; font-weight: 800; }
        .health-info strong { display: block; font-size: 1rem; color: var(--text); }
        .health-info span { font-size: 0.8rem; color: var(--primary); font-weight: 600; }
        
        .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .metric-item { background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 14px; border-radius: 12px; text-align: center; }
        .m-label { display: block; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 4px; text-transform: uppercase; }
        .m-value { font-size: 1.1rem; font-weight: 700; color: var(--text); }
        
        .stat-section header { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 12px; }
        .lang-row { margin-bottom: 12px; }
        .lang-info { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 6px; }
        .progress-mini { height: 4px; background: rgba(255,255,255,0.05); border-radius: 2px; overflow: hidden; }
        .progress-mini .fill { height: 100%; background: var(--primary); }
        
        .file-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 0.8rem; }
        .badge { background: var(--bg-input); padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; color: var(--text-muted); }
        
        .bug-card { background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; transition: 0.2s; }
        .bug-card:hover { border-color: var(--primary); }
        .bug-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .severity { font-size: 0.65rem; font-weight: 800; padding: 2px 8px; border-radius: 6px; text-transform: uppercase; }
        .severity.critical { background: rgba(239,68,68,0.2); color: #ef4444; }
        .severity.warning { background: rgba(245,158,11,0.2); color: #f59e0b; }
        .file-link { font-family: monospace; font-size: 0.75rem; color: var(--text-muted); }
        .description { font-size: 0.88rem; line-height: 1.5; margin-bottom: 10px; }
        .suggestion { font-size: 0.8rem; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; color: var(--text-muted); }
        
        .markdown-viewer { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; padding: 24px; font-size: 0.92rem; line-height: 1.7; }
        .export-view h3 { margin-bottom: 8px; }
        .export-view p { margin-bottom: 24px; color: var(--text-muted); font-size: 0.85rem; }
        .export-actions { display: flex; flex-direction: column; gap: 12px; }
        
        .w-full { width: 100%; }
        .mb-4 { margin-bottom: 16px; }
        .panel-loading { text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.9rem; }
        .spinner-sm { width: 16px; height: 16px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; display: inline-block; margin-right: 8px; vertical-align: middle; }
      `}} />
    </>
  );
}

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div 
        className="tree-node-item" 
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={() => node.is_dir && setOpen(!open)}
      >
        <span className="tree-icon">{node.is_dir ? (open ? "▼" : "▶") : "•"}</span>
        <span className="tree-name">{node.name}</span>
        {node.chunk_count > 0 && <span className="tree-badge">{node.chunk_count}</span>}
      </div>
      {node.is_dir && open && node.children.map((child) => <FileTreeNode key={child.path} node={child} depth={depth + 1} />)}
      <style dangerouslySetInnerHTML={{ __html: `
        .tree-node-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; border-radius: 8px; transition: 0.2s; font-size: 0.85rem; }
        .tree-node-item:hover { background: rgba(255,255,255,0.04); }
        .tree-icon { color: var(--primary); width: 14px; font-size: 0.7rem; }
        .tree-name { flex: 1; color: var(--text); }
        .tree-badge { font-size: 0.65rem; color: var(--primary); background: var(--primary-glow); padding: 1px 6px; border-radius: 10px; }
      `}} />
    </div>
  );
}
