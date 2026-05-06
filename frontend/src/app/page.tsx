"use client";

import { useState, useEffect } from "react";
import RepoLoader from "@/components/RepoLoader";
import ChatWindow from "@/components/ChatWindow";
import AnalysisPanel from "@/components/AnalysisPanel";
import FileViewerModal from "@/components/FileViewerModal";
import { useChatStore } from "@/store/chatStore";
import { repoApi } from "@/lib/api";

export default function HomePage() {
  const repos        = useChatStore((s) => s.repos);
  const activeRepoId = useChatStore((s) => s.activeRepoId);
  const setRepos     = useChatStore((s) => s.setRepos);
  const setActiveRepo = useChatStore((s) => s.setActiveRepo);
  const removeRepo   = useChatStore((s) => s.removeRepo);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(true);

  // Load repo list on mount
  useEffect(() => {
    repoApi
      .list()
      .then((list) => {
        setRepos(list);
        setRepoError(null);
        // Auto-select first indexed repo if none active
        if (!useChatStore.getState().activeRepoId) {
          const firstIndexed = list.find((r) => r.status === "INDEXED");
          if (firstIndexed) setActiveRepo(firstIndexed.repo_id);
        }
      })
      .catch((err: Error) => {
        setRepoError(err.message || "Failed to load repositories.");
      });
      
    if (typeof window !== "undefined") {
      setOnboardingDismissed(localStorage.getItem('hw_onboarding_dismissed') === '1');
    }
  }, [setRepos]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "k") {
        e.preventDefault();
        setActiveRepo(null);
      }
      if (mod && e.key === "/") {
        e.preventDefault();
        document.getElementById("chat-input")?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveRepo]);

  const handleDeleteRepo = async (id: string) => {
    try {
      await repoApi.delete(id);
      removeRepo(id);
      if (activeRepoId === id) setActiveRepo(null);
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Failed to delete repository.");
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      document.querySelectorAll('.detailed-section').forEach(s => s.classList.remove('active-glow'));
      element.classList.add('active-glow');
    }
  };

  const dismissOnboarding = () => {
    const banner = document.getElementById('onboarding-banner');
    if (banner) {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => { 
        setOnboardingDismissed(true);
      }, 350);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem('hw_onboarding_dismissed', '1');
    }
  };

  return (
    <div className="app-container full-width">
      <main className="content-wrapper">
        <header className="top-bar">
          <div className="logo-area">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="var(--primary)" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            <span className="logo-text">GitGrok AI</span>
          </div>
          <div className="header-actions" style={{ marginLeft: 'auto' }}>
            <button 
              className="btn-primary" 
              style={{ fontSize: '0.85rem', padding: '6px 12px' }}
              onClick={() => {
                const upsertRepo = useChatStore.getState().upsertRepo;
                upsertRepo({
                  repo_id: "demo-repo",
                  name: "expressjs/express (Demo)",
                  url: "https://github.com/expressjs/express",
                  status: "INDEXED",
                  chunk_count: 156,
                  indexed_at: new Date().toISOString()
                });
                setActiveRepo("demo-repo");
                scrollToSection("screen-analysis");
              }}
            >
              Demo Mode
            </button>
          </div>
        </header>

        <div className="app-scroller">
          {!onboardingDismissed && (
            <div className="onboarding-banner" id="onboarding-banner">
              <div className="onboarding-header">
                <div className="onboarding-title">
                  <span className="onboarding-badge">Getting Started</span>
                  <h2>Set up GitGrok AI in 3 steps</h2>
                  <p>Follow these steps to start chatting with your repositories.</p>
                </div>
                <button className="onboarding-dismiss" onClick={dismissOnboarding} title="Dismiss">
                  <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
              <div className="onboarding-steps">
                <div className="onboarding-step" onClick={() => scrollToSection('screen-sync-drive')}>
                  <div className="step-number">1</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 12l-4-4v3H3v2h15v3l4-4z"></path><path d="M2 12l4 4v-3h15v-2H6V8l-4 4z"></path></svg>
                  </div>
                  <div className="step-text">
                    <div className="step-label">Step 1</div>
                    <strong>Connect Repository</strong>
                    <span>Load a GitHub repo to access code</span>
                  </div>
                  <svg className="step-arrow" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <div className="step-connector"></div>
                <div className="onboarding-step" onClick={() => scrollToSection('screen-documents')}>
                  <div className="step-number">2</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                  </div>
                  <div className="step-text">
                    <div className="step-label">Step 2</div>
                    <strong>Select Document</strong>
                    <span>Choose an indexed repo</span>
                  </div>
                  <svg className="step-arrow" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
                <div className="step-connector"></div>
                <div className="onboarding-step" onClick={() => scrollToSection('screen-ask-ai')}>
                  <div className="step-number">3</div>
                  <div className="step-icon">
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                  </div>
                  <div className="step-text">
                    <div className="step-label">Step 3</div>
                    <strong>Ask AI Anything</strong>
                    <span>Chat with your codebase instantly</span>
                  </div>
                  <svg className="step-arrow" viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
              </div>
            </div>
          )}

          <section className="feature-selection-section">
            <div className="feature-grid">
              <div className="feature-card" onClick={() => scrollToSection('screen-sync-drive')}>
                <div className="feature-icon orange">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M22 12l-4-4v3H3v2h15v3l4-4z"></path><path d="M2 12l4 4v-3h15v-2H6V8l-4 4z"></path></svg>
                </div>
                <div className="feature-info">
                  <h3>Step 1: Sync Repo</h3>
                  <p>Index GitHub repo</p>
                </div>
              </div>
              <div className="feature-card" onClick={() => scrollToSection('screen-documents')}>
                <div className="feature-icon orange">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                </div>
                <div className="feature-info">
                  <h3>Step 2: Library</h3>
                  <p>Select your repository</p>
                </div>
              </div>
              <div className="feature-card" onClick={() => scrollToSection('screen-analysis')}>
                <div className="feature-icon orange">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                </div>
                <div className="feature-info">
                  <h3>Step 3: Analysis</h3>
                  <p>Stats, Bugs & Docs</p>
                </div>
              </div>
              <div className="feature-card" onClick={() => scrollToSection('screen-ask-ai')}>
                <div className="feature-icon orange">
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                </div>
                <div className="feature-info">
                  <h3>Step 4: Ask AI</h3>
                  <p>Chat with your codebase</p>
                </div>
              </div>
            </div>
          </section>

          <div className="section-divider"></div>
          
          <div className="screen-content">
            <section id="screen-sync-drive" className="screen-container detailed-section active-glow">
              <div className="page-header">
                <h2>Step 1: Repository Integration</h2>
                <p>Connect and index your GitHub repository to build your knowledge base.</p>
              </div>
              <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
                <RepoLoader />
              </div>
            </section>

            <section id="screen-documents" className="screen-container detailed-section">
              <div className="page-header">
                <h2>Step 2: Knowledge Library</h2>
                <p>Select a repository to begin analysis and chatting.</p>
              </div>
              {repoError && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{repoError}</p>}
              <div className="documents-grid" id="documents-list">
                {repos.length === 0 ? (
                  <div className="empty-state">
                    <p>No repositories indexed yet. Complete Step 1.</p>
                  </div>
                ) : (
                  repos.map((repo) => (
                    <div 
                      key={repo.repo_id} 
                      className="document-card"
                      style={{ cursor: repo.status === "INDEXED" ? "pointer" : "default", borderColor: activeRepoId === repo.repo_id ? 'var(--primary)' : '' }}
                      onClick={() => repo.status === "INDEXED" && setActiveRepo(repo.repo_id)}
                    >
                      <div className="document-icon">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      </div>
                      <div className="document-info" style={{ flex: 1 }}>
                        <div className="doc-name">{repo.name}</div>
                        <div className="doc-meta">
                          {repo.status === "INDEXED" ? `${repo.chunk_count} chunks` : repo.status}
                        </div>
                      </div>
                      <button
                        title="Delete repository"
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', marginLeft: 'auto' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRepo(repo.repo_id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section id="screen-analysis" className="screen-container detailed-section">
              <div className="page-header">
                <h2>Step 3: System Analysis</h2>
                <p>View stats, scan for bugs, and manage repo insights.</p>
              </div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                 <div style={{ height: "600px", display: 'flex', flexDirection: 'column' }}>
                    <AnalysisPanel />
                 </div>
              </div>
            </section>

            <section id="screen-ask-ai" className="screen-container detailed-section">
              <div className="section-header">
                <h2>Step 4: Ask AI Assistant</h2>
                <p>Query your repository knowledge base in real-time.</p>
              </div>
              <div className="chat-wrapper" style={{ height: "600px" }}>
                 <ChatWindow />
              </div>
            </section>

          </div>
        </div>
      </main>
      <FileViewerModal />
    </div>
  );
}

