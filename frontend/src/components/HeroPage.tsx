"use client";

import React from 'react';

export default function HeroPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="hero-container">
      {/* Navbar overlay */}
      <nav className="hero-nav">
        <div className="hero-nav-left">
          <div className="hero-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
              <polyline points="2 17 12 22 22 17"/>
              <polyline points="2 12 12 17 22 12"/>
            </svg>
            <span className="hero-logo-text">RepoMind</span>
          </div>
          <div className="hero-links">
            <span>Products <span className="arrow">▼</span></span>
            <span>Services <span className="arrow">▼</span></span>
            <span>Resources <span className="arrow">▼</span></span>
            <span>Partnerships <span className="arrow">▼</span></span>
            <span>Blog <span className="arrow">▼</span></span>
          </div>
        </div>
        <div className="hero-nav-right">
          <span className="hero-login">Login</span>
          <button className="btn-nav-primary" onClick={onEnter}>Access Platform</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="hero-main">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="dot"></span> AI-Powered Code Intelligence
          </div>
          
          <h1 className="hero-title">
            Your Codebase,<br/>
            <span className="hero-highlight">Supercharged</span><br/>
            by AI
          </h1>
          
          <p className="hero-subtitle">
            Chat with any GitHub repository instantly. Ask questions, find bugs, and understand complex architecture in seconds.
          </p>

          <div className="hero-cta-group">
            <button className="btn-hero-primary" onClick={onEnter}>Access Code Platform</button>
            <button className="btn-hero-secondary" onClick={onEnter}>For Enterprise</button>
          </div>

          <div className="hero-checks">
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> No setup required</span>
            <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> RAG-powered accuracy</span>
          </div>
        </div>

        <div className="hero-graphic">
          <div className="try-label">
            Try it live ✨
            <svg className="try-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
          </div>
          
          <div className="mockup-window">
            <div className="mockup-header">
              <div className="mockup-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="mockup-title">
                <h4>AI Code Assistant</h4>
                <p>Your personal pair programmer</p>
              </div>
              <div className="mockup-status">
                <span className="status-dot"></span> Active
              </div>
            </div>
            
            <div className="mockup-body">
              <div className="mockup-msg">
                <span className="mockup-avatar">👨‍💻</span>
                <p>Hi 👋 I'm here to accelerate your coding. What would you like to explore?</p>
              </div>
              
              <div className="mockup-chips">
                <div className="m-chip">🔍 Explain the Architecture</div>
                <div className="m-chip">📄 Generate documentation</div>
                <div className="m-chip">🚀 Find memory leaks</div>
                <div className="m-chip">💻 Write unit tests</div>
                <div className="m-chip">🛠 Refactor this module</div>
              </div>
            </div>
            
            <div className="mockup-footer">
              ✨ Powered by RepoMind AI  •  Response time ~200ms
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .hero-container {
          min-height: 100vh;
          background-color: #0d0d0d;
          background-image: radial-gradient(circle at 70% 50%, rgba(245, 158, 11, 0.15), transparent 45%);
          color: #fff;
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .hero-nav {
          background: #ffffff;
          color: #111;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.8rem 2rem;
          font-weight: 500;
          font-size: 0.9rem;
        }
        .hero-nav-left { display: flex; align-items: center; gap: 40px; }
        .hero-logo { display: flex; align-items: center; gap: 8px; color: #ff9000; }
        .hero-logo-text { color: #111; font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; }
        .hero-links { display: flex; gap: 24px; color: #555; }
        .hero-links span { cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .hero-links span:hover { color: #111; }
        .arrow { font-size: 0.6rem; color: #999; }
        
        .hero-nav-right { display: flex; align-items: center; gap: 20px; }
        .hero-login { cursor: pointer; color: #555; }
        .hero-login:hover { color: #111; }
        .btn-nav-primary {
          background: #ff9900;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-nav-primary:hover { background: #e68a00; }

        .hero-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 4rem 2rem;
          gap: 60px;
        }

        .hero-content {
          flex: 1;
          max-width: 540px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,153,0,0.3);
          background: rgba(255,153,0,0.1);
          color: #ffb74d;
          padding: 6px 14px;
          border-radius: 99px;
          font-size: 0.8rem;
          font-weight: 500;
          margin-bottom: 24px;
        }
        .hero-badge .dot {
          width: 6px; height: 6px; background: #ff9900; border-radius: 50%;
        }

        .hero-title {
          font-size: 4rem;
          line-height: 1.1;
          font-weight: 800;
          margin-bottom: 24px;
          letter-spacing: -0.03em;
          color: #ffffff;
        }
        .hero-highlight {
          color: #ff9900;
        }

        .hero-subtitle {
          font-size: 1.15rem;
          color: #a3a3a3;
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 90%;
        }

        .hero-cta-group {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
        }
        .btn-hero-primary {
          background: #ff9900;
          color: #111;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .btn-hero-primary:hover { transform: translateY(-2px); background: #ffa629; }
        
        .btn-hero-secondary {
          background: #2a2a2a;
          color: #fff;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          border: 1px solid #444;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-hero-secondary:hover { background: #333; }

        .hero-checks {
          display: flex;
          gap: 24px;
          color: #888;
          font-size: 0.85rem;
        }
        .hero-checks span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .hero-graphic {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .try-label {
          color: #f59e0b;
          font-weight: 500;
          font-size: 0.95rem;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .mockup-window {
          width: 100%;
          max-width: 500px;
          background: #17171e;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 0 60px rgba(245, 158, 11, 0.15);
          overflow: hidden;
        }
        
        .mockup-header {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: #1c1c24;
        }
        .mockup-icon {
          width: 36px; height: 36px; background: #ff9900; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          margin-right: 14px;
        }
        .mockup-title { flex: 1; }
        .mockup-title h4 { font-size: 0.95rem; margin: 0; color: #fff; }
        .mockup-title p { font-size: 0.75rem; color: #888; margin: 0; }
        
        .mockup-status {
          display: flex; align-items: center; gap: 6px;
          font-size: 0.8rem; color: #888;
        }
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; }

        .mockup-body {
          padding: 24px 20px;
        }
        .mockup-msg {
          display: flex; gap: 12px; align-items: flex-start;
          margin-bottom: 24px; color: #e5e5e5; font-size: 0.9rem;
          line-height: 1.5;
        }
        .mockup-avatar {
          width: 28px; height: 28px; background: rgba(255,255,255,0.05);
          border-radius: 6px; display: flex; align-items: center; justify-content: center;
          border: 1px solid rgba(255,255,255,0.05); font-size: 0.8rem;
        }
        
        .mockup-chips {
          display: flex; flex-wrap: wrap; gap: 10px;
          padding-left: 40px;
        }
        .m-chip {
          padding: 8px 16px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          color: #aaa;
          font-size: 0.8rem;
          cursor: pointer;
        }
        .m-chip:hover { border-color: rgba(255,255,255,0.2); color: #ddd; }

        .mockup-footer {
          padding: 12px; text-align: center;
          font-size: 0.7rem; color: #666;
          border-top: 1px solid rgba(255,255,255,0.03);
          background: #131318;
        }
      `}</style>
    </div>
  );
}
