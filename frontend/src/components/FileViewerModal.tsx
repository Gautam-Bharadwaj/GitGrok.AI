"use client";

import React, { useEffect, useState } from "react";
import { useChatStore } from "@/store/chatStore";
import { analysisApi, FileNode } from "@/lib/api";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export default function FileViewerModal() {
  const selectedSource = useChatStore((s) => s.selectedSource);
  const setSelectedSource = useChatStore((s) => s.setSelectedSource);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<FileNode[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    if (selectedSource && activeRepoId) {
      setLoading(true);
      analysisApi.read(activeRepoId, selectedSource.file_path)
        .then(res => setContent(res.content))
        .catch(err => setContent(`Error loading file: ${err.message}`))
        .finally(() => setLoading(false));
    }
  }, [selectedSource, activeRepoId]);

  useEffect(() => {
    if (activeRepoId && selectedSource) {
      setFilesLoading(true);
      analysisApi.files(activeRepoId)
        .then(res => setFileList(res))
        .finally(() => setFilesLoading(false));
    }
  }, [activeRepoId, !!selectedSource]);

  if (!selectedSource) return null;

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div 
          className={`tree-node ${node.path === selectedSource.file_path ? 'active' : ''}`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => {
            if (!node.is_dir) {
              setSelectedSource({
                file_path: node.path,
                start_line: 1,
                end_line: 1,
                name: node.name,
                language: node.language,
                snippet: ""
              });
            }
          }}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.6 }}>
            {node.is_dir 
              ? <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              : <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            }
          </svg>
          <span className="node-name truncate">{node.name}</span>
        </div>
        {node.is_dir && node.children && renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="file-viewer-overlay animate-fadeIn" onClick={() => setSelectedSource(null)}>
      <div className="file-viewer-content animate-slideInRight" onClick={(e) => e.stopPropagation()}>
        <header className="file-viewer-header">
          <div className="file-info">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <div className="file-meta">
              <span className="file-name">{selectedSource.file_path.split('/').pop()}</span>
              <span className="file-path">{selectedSource.file_path}</span>
            </div>
          </div>
          <button className="btn-close" onClick={() => setSelectedSource(null)}>
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div className="viewer-layout">
          <aside className="file-tree-sidebar">
            <div className="sidebar-label">Explorer</div>
            <div className="tree-container">
              {filesLoading ? <div className="tree-loading">...</div> : renderFileTree(fileList)}
            </div>
          </aside>
          
          <main className="file-viewer-body">
            {loading ? (
              <div className="viewer-loading">
                <div className="spinner"></div>
                <span>Fetching source...</span>
              </div>
            ) : (
              <SyntaxHighlighter
                language={selectedSource.language || "javascript"}
                style={vscDarkPlus}
                showLineNumbers
                startingLineNumber={1}
                wrapLines={true}
                lineProps={(lineNumber) => {
                  const style: React.CSSProperties = { display: "block", width: "100%" };
                  if (lineNumber >= selectedSource.start_line && lineNumber <= selectedSource.end_line) {
                    style.backgroundColor = "rgba(255, 102, 0, 0.12)";
                    style.borderLeft = "2px solid var(--primary)";
                  }
                  return { style };
                }}
                customStyle={{
                  margin: 0,
                  padding: "20px",
                  fontSize: "0.82rem",
                  background: "transparent",
                  height: "100%",
                }}
              >
                {content || ""}
              </SyntaxHighlighter>
            )}
          </main>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .file-viewer-overlay {
          position: fixed; inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          z-index: 2000; display: flex; justify-content: flex-end;
        }
        .file-viewer-content {
          width: 1000px; max-width: 95%;
          background: #080808; height: 100%;
          display: flex; flex-direction: column;
          border-left: 1px solid var(--border);
          box-shadow: -20px 0 50px rgba(0,0,0,0.6);
        }
        .file-viewer-header {
          padding: 14px 24px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.02);
        }
        .file-info { display: flex; align-items: center; gap: 12px; }
        .file-meta { display: flex; flex-direction: column; }
        .file-name { font-weight: 600; font-size: 0.9rem; }
        .file-path { font-size: 0.7rem; color: var(--text-muted); font-family: monospace; }
        .btn-close { background: transparent; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; transition: color 0.2s; }
        .btn-close:hover { color: var(--text); }
        
        .viewer-layout { flex: 1; display: flex; overflow: hidden; }
        .file-tree-sidebar {
          width: 240px; flex-shrink: 0;
          border-right: 1px solid var(--border);
          display: flex; flex-direction: column;
          background: rgba(255,255,255,0.01);
        }
        .sidebar-label {
          padding: 12px 20px; font-size: 0.65rem;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: var(--text-muted); font-weight: 700;
          border-bottom: 1px solid var(--border);
        }
        .tree-container { flex: 1; overflow-y: auto; padding: 10px 0; }
        .tree-node {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 12px; font-size: 0.8rem;
          cursor: pointer; transition: all 0.2s;
          color: var(--text-muted); border-left: 2px solid transparent;
        }
        .tree-node:hover { background: rgba(255,255,255,0.04); color: var(--text); }
        .tree-node.active { 
          background: rgba(255,102,0,0.08); 
          color: var(--primary); 
          border-left-color: var(--primary); 
        }
        .node-name { flex: 1; }
        
        .file-viewer-body { flex: 1; overflow: auto; background: #0d0d0d; }
        .viewer-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 16px; color: var(--text-muted); }
        .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
