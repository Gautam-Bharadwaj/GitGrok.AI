"use client";

import React, { useState } from 'react';

export default function HeroPage({ onEnter }: { onEnter: () => void }) {
  const [activeTab, setActiveTab] = useState('Code Generation');

  const features = {
    'Architecture Graph': {
      title: 'Architecture Graph',
      subtitle: 'Visualize your entire codebase structure instantly',
      badge: 'Graph generated in 1.2s',
      pills: ['Interactive nodes', 'Import mapping', 'Circular dependencies', 'Module health'],
      cta: 'View Graph Demo >',
      mockupCode: `// Architecture Map
[AuthModule] -> [Database]
[UserStore] -> [APIClient]
[APIClient] -> [AuthModule]
// Warning: Circular dependency detected
// between UserStore and APIClient`,
      fileName: 'architecture_map.json'
    },
    'Code Review': {
      title: 'Code Review',
      subtitle: 'Get PR comments and style suggestions automatically',
      badge: '250k Pull Requests scanned',
      pills: ['Strict style rules', 'Performance linting', 'Security checks', 'Design patterns'],
      cta: 'Start AI Review >',
      mockupCode: `// AI Suggestion:
// Line 42: Consider using UseMemo 
// to prevent unnecessary 
// re-renders in this complex
// component.
const data = useMemo(() => {
  return compute(props.id);
}, [props.id]);`,
      fileName: 'review_summary.md'
    },
    'Bug Fixing': {
      title: 'Bug Fixing',
      subtitle: 'Autonomously find and fix critical logical errors',
      badge: '2M+ Bugs squashed',
      pills: ['Race conditions', 'Memory leaks', 'Null pointers', 'Logical flaws'],
      cta: 'Fix My Bugs >',
      mockupCode: `// Bug Found: Potential race condition
// in async data fetching.
// AI Fix Applied:
async function fetchData() {
  const controller = new AbortController();
  // ... fix implementation
  return response.json();
}`,
      fileName: 'bug_report.ts'
    },
    'Code Generation': {
      title: 'Code Generation',
      subtitle: 'Write production-ready, highly optimized code in seconds',
      badge: '5M+ Lines Written',
      pills: ['Context-aware logic', 'Best practices builtin', 'One-click insertion', 'Style alignment'],
      cta: 'Try Generation Free >',
      mockupCode: `import { jwt } from 'jsonwebtoken';

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch (e) {
    return null;
  }
};`,
      fileName: 'src/utils/auth.ts'
    },
    'Test Writer': {
      title: 'Test Writer',
      subtitle: 'Generate comprehensive unit and integration tests',
      badge: '100% Coverage goals',
      pills: ['Jest / Vitest support', 'Edge case detection', 'Mocking automation', 'Snapshot testing'],
      cta: 'Write Tests Now >',
      mockupCode: `describe('Auth Service', () => {
  it('should verify valid tokens', () => {
    const token = signToken({ id: 1 });
    const result = verifyToken(token);
    expect(result.id).toBe(1);
  });
});`,
      fileName: 'tests/auth.test.ts'
    }
  };

  const currentFeature = features[activeTab as keyof typeof features];

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
            <span className="hero-logo-text">GitGrock.AI</span>
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
            Try it live
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
                <span className="mockup-avatar">AI</span>
                <p>I'm here to accelerate your coding. What would you like to explore?</p>
              </div>
              
              <div className="mockup-chips">
                <div className="m-chip">Explain the Architecture</div>
                <div className="m-chip">Generate documentation</div>
                <div className="m-chip">Find memory leaks</div>
                <div className="m-chip">Write unit tests</div>
                <div className="m-chip">Refactor this module</div>
              </div>
            </div>
            
            <div className="mockup-footer">
              Powered by GitGrock.AI  •  Response time ~200ms
            </div>
          </div>
        </div>
      </main>

      {/* --- NEW STATS & LOGOS SECTION --- */}
      <section className="hero-stats-section">
        <div className="hero-stats">
          <div className="stat-item">
            <h3>10M+</h3>
            <p>Code Reviews</p>
          </div>
          <div className="stat-item">
            <h3>2M+</h3>
            <p>Issues Resolved</p>
          </div>
          <div className="stat-item">
            <h3>95%</h3>
            <p>Success Rate</p>
          </div>
          <div className="stat-item">
            <h3>1M+</h3>
            <p>Developers</p>
          </div>
        </div>

        <div className="hero-logos-wrapper">
          <p className="logos-title">Trusted by engineering teams at</p>
          <div className="hero-logos">
            <span className="logo-placeholder">Microsoft</span>
            <span className="logo-placeholder" style={{ color: '#06b6d4' }}>Meta</span>
            <span className="logo-placeholder" style={{ color: '#0ea5e9' }}>PayPal</span>
            <span className="logo-placeholder" style={{ color: '#3b82f6' }}>SAMSUNG</span>
            <span className="logo-placeholder" style={{ color: '#8b5cf6' }}>Unilever</span>
          </div>
          <div className="trust-badges">
            <span><span className="dot-green"></span> 256-bit SSL Encryption</span>
            <span><span className="dot-green"></span> SOC 2 Type II Certified</span>
            <span><span className="dot-green"></span> GDPR Compliant</span>
          </div>
        </div>
      </section>

      {/* --- NEW FEATURES SECTION --- */}
      <section className="hero-features-section">
        <div className="feature-badge">
          <span className="dot"></span> AI-Powered Developer Tools
        </div>
        <h2 className="features-title">Everything You Need to Ship Faster</h2>
        <p className="features-subtitle">Five powerful tools, one terminal. Get production-ready code faster with AI.</p>
        
        <div className="feature-tabs">
          {Object.keys(features).map((tab) => (
            <button 
              key={tab}
              className={`f-tab ${activeTab === tab ? 'active-tab' : 'hover-tab'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="feature-content-grid">
          <div className="fc-left">
            <div className="fc-mini-badge">{currentFeature.badge}</div>
            <h3>{currentFeature.title}</h3>
            <p>{currentFeature.subtitle}</p>
            
            <div className="fc-grid">
              {currentFeature.pills.map((pill) => (
                <div key={pill} className="fc-pill">
                  <span className="fc-check">✓</span> {pill}
                </div>
              ))}
            </div>

            <button className="btn-feature-cta" onClick={onEnter}>{currentFeature.cta}</button>
          </div>
          
          <div className="fc-right">
            <div className="fc-mockup">
              <div className="mockup-bg-element"></div>
              <div className="mockup-main-panel">
                <div className="panel-header">
                  <div className="mac-dots"><span></span><span></span><span></span></div>
                  <code>{currentFeature.fileName}</code>
                </div>
                <div className="panel-body">
                  {currentFeature.mockupCode.split('\n').map((line, idx) => (
                    <div key={idx} className={`code-line ${idx > 1 ? 'highlight-line' : ''}`}>
                      <span>{idx + 1}</span>
                      <pre style={{ margin: 0, font: 'inherit', color: 'inherit' }}>{line}</pre>
                    </div>
                  ))}
                </div>
                {/* Floating widgets */}
                <div className="floating-widget fw-top">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ff9000" alt="avatar" />
                  <div>
                    <strong>Code Gen AI</strong>
                    <p>Generated auth verification flow.</p>
                  </div>
                </div>
                <div className="floating-tools">
                  <div className="tool-circle" style={{background: '#3b82f6'}}></div>
                  <div className="tool-circle" style={{background: '#10b981'}}></div>
                  <div className="tool-circle" style={{background: '#f59e0b'}}></div>
                  <div className="tool-circle" style={{background: '#8b5cf6'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- NEW 3 STEPS SECTION HEADER --- */}
      <section className="hero-steps-section">
         <div className="feature-badge" style={{margin:'0 auto 20px'}}>
          <span className="dot"></span> AI-Powered Process
        </div>
        <h2>AI-Powered Code Transformation in 3 Steps</h2>
        <p>One upload, total codebase dominance—AI refines every part of your architecture.</p>

        {/* --- FLOWCHART GRAPHIC --- */}
        <div className="process-flowchart">
          <div className="flow-node head-node">
            <span className="node-num">01</span>
            <div className="node-box">
              <div className="n-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div className="n-text">
                <h4>Upload Repo</h4>
                <p>GitHub or Zip file</p>
              </div>
            </div>
            <div className="connector-dot right"></div>
          </div>
          
          <svg className="flow-lines" preserveAspectRatio="none" viewBox="0 0 200 300">
            {/* Base Paths (Static) */}
            <path d="M0 150 C 100 150, 100 30, 200 30" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />
            <path d="M0 150 C 100 150, 100 90, 200 90" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />
            <path d="M0 150 L 200 150" stroke="rgba(245,158,11,0.2)" strokeWidth="1" fill="none" />
            <path d="M0 150 C 100 150, 100 210, 200 210" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />
            <path d="M0 150 C 100 150, 100 270, 200 270" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />

            {/* Animated Paths (Overlay) */}
            <path className="animated-path p1" d="M0 150 C 100 150, 100 30, 200 30" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p2" d="M0 150 C 100 150, 100 90, 200 90" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p3" d="M0 150 L 200 150" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p4" d="M0 150 C 100 150, 100 210, 200 210" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p5" d="M0 150 C 100 150, 100 270, 200 270" stroke="#ff9900" strokeWidth="2" fill="none" />
          </svg>

          <div className="flow-middle">
            <div className="node-box small-node">
              <div className="connector-dot left"></div><div className="n-icon-small"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div><div><h5>Code Context</h5><p>AST parsing</p></div><div className="connector-dot right"></div>
            </div>
            <div className="node-box small-node">
              <div className="connector-dot left"></div><div className="n-icon-small"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div><div><h5>Dep Analysis</h5><p>Map imports</p></div><div className="connector-dot right"></div>
            </div>
            <div className="node-box small-node active-node">
              <div className="connector-dot left"></div><div className="n-icon-small"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div><div><h5>Vector Embed</h5><p>AI semantic map</p></div><div className="connector-dot right"></div>
            </div>
            <div className="node-box small-node">
              <div className="connector-dot left"></div><div className="n-icon-small"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div><div><h5>Vulnerability</h5><p>Security scan</p></div><div className="connector-dot right"></div>
            </div>
            <div className="node-box small-node">
              <div className="connector-dot left"></div><div className="n-icon-small"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div><div><h5>Architecture</h5><p>Diagram gen</p></div><div className="connector-dot right"></div>
            </div>
          </div>

          <svg className="flow-lines reverse" preserveAspectRatio="none" viewBox="0 0 200 300">
            {/* Base Paths (Static) */}
            <path d="M0 30 C 100 30, 100 150, 200 150" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />
            <path d="M0 90 C 100 90, 100 150, 200 150" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />
            <path d="M0 150 L 200 150" stroke="rgba(245,158,11,0.2)" strokeWidth="1" fill="none" />
            <path d="M0 210 C 100 210, 100 150, 200 150" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />
            <path d="M0 270 C 100 270, 100 150, 200 150" stroke="rgba(245,158,11,0.15)" strokeWidth="1" fill="none" />

            {/* Animated Paths (Overlay) */}
            <path className="animated-path p1" d="M0 30 C 100 30, 100 150, 200 150" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p2" d="M0 90 C 100 90, 100 150, 200 150" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p3" d="M0 150 L 200 150" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p4" d="M0 210 C 100 210, 100 150, 200 150" stroke="#ff9900" strokeWidth="2" fill="none" />
            <path className="animated-path p5" d="M0 270 C 100 270, 100 150, 200 150" stroke="#ff9900" strokeWidth="2" fill="none" />
          </svg>

          <div className="flow-node tail-node">
            <div className="connector-dot left"></div>
            <div className="node-box">
              <div className="n-icon" style={{background:'#10b981', color:'#000'}}>✓</div>
              <div className="n-text">
                <h4>Code &amp; Succeed</h4>
                <p>Start chatting flawlessly</p>
              </div>
            </div>
            <span className="node-num num-green">03</span>
          </div>
        </div>

        {/* --- 3 CARDS UNDER FLOWCHART --- */}
        <div className="process-cards">
          <div className="p-card">
            <div className="pc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <h4>Instant Analysis</h4>
            <p>AI processes everything in parallel within seconds</p>
          </div>
          <div className="p-card">
            <div className="pc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h4>Personalized Results</h4>
            <p>Tailored recommendations based on your unique stack</p>
          </div>
          <div className="p-card">
            <div className="pc-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </div>
            <h4>Ready to Ship</h4>
            <p>Get production-ready materials optimized for success</p>
          </div>
        </div>

        <div className="process-cta-text">
          <p>Ready to transform your codebase?</p>
          <button className="btn-feature-cta" onClick={onEnter}>Get Started Free &rarr;</button>
        </div>
      </section>

      {/* --- BIG DIAGONAL STRIPE CTA SECTION --- */}
      <section className="hero-final-cta pattern-bg">
        <div className="feature-badge" style={{margin:'0 auto 20px', border:'1px solid rgba(0,0,0,0.5)', color:'#fff', background:'rgba(0,0,0,0.2)'}}>
          <span className="dot" style={{background:'#fff'}}></span> Final Step
        </div>
        
        <h2>Ready to Build Your Engineering<br/><span className="hero-highlight">Smarter?</span></h2>
        <p>Join millions of professionals using our AI-powered platform to write clean architecture.<br/>Start your AI-enhanced lifecycle today.</p>
        
        <div className="hero-cta-group" style={{justifyContent: 'center', marginTop: '30px'}}>
          <button className="btn-hero-primary" onClick={onEnter}>Start Free with AI &gt;</button>
          <button className="btn-hero-secondary" onClick={onEnter}>For Enterprise</button>
        </div>
        
        <div className="hero-checks" style={{justifyContent: 'center', marginTop: '20px', marginBottom: '60px'}}>
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> No credit card required</span>
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Instant AI access</span>
        </div>

        <div className="bottom-metrics">
          <div className="bm-item">
            <div className="bm-icon">🧠</div>
            <div>
              <strong>AI Powered</strong>
              <p>Latest AI model</p>
            </div>
          </div>
          <div className="bm-item">
            <div className="bm-icon">⚡️</div>
            <div>
              <strong>Real-time AI</strong>
              <p>Instant optimization</p>
            </div>
          </div>
          <div className="bm-item">
            <div className="bm-icon">✨</div>
            <div>
              <strong>10M+ Sessions</strong>
              <p>Proven AI results</p>
            </div>
          </div>
        </div>

        <div className="hero-logos-wrapper" style={{maxWidth: '800px', margin: '0 auto'}}>
          <p className="logos-title" style={{background:'transparent', color:'#ccc'}}>Trusted by professionals at</p>
          <div className="hero-logos" style={{opacity: 0.7, gridTemplateColumns: 'repeat(5, 1fr)', display: 'grid', gap: '30px', alignItems: 'center'}}>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Google</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Microsoft</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Meta</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>PayPal</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Unilever</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Coca-Cola</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Intel</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>NETFLIX</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>VISA</span>
            <span className="logo-placeholder" style={{fontSize:'1.1rem'}}>Walmart</span>
          </div>
        </div>
      </section>




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
        .status-dot { width: 8px; height: 8px; background: #10b981; border-radius: 50%; animation: pulse 2s infinite; }

        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1.1); opacity: 0.8; box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        
        @keyframes glow {
          0% { box-shadow: 0 0 5px rgba(255, 153, 0, 0.2); border-color: rgba(255, 153, 0, 0.3); }
          50% { box-shadow: 0 0 20px rgba(255, 153, 0, 0.5); border-color: rgba(255, 153, 0, 0.6); }
          100% { box-shadow: 0 0 5px rgba(255, 153, 0, 0.2); border-color: rgba(255, 153, 0, 0.3); }
        }

        @keyframes flowData {
           0% { stroke-dashoffset: 400; opacity: 0; }
           10% { opacity: 1; }
           90% { opacity: 1; }
           100% { stroke-dashoffset: 0; opacity: 0; }
        }

        .animated-path {
          stroke-dasharray: 10, 390;
          animation: flowData 3s linear infinite;
        }
        .p1 { animation-delay: 0s; }
        .p2 { animation-delay: 0.5s; }
        .p3 { animation-delay: 1s; }
        .p4 { animation-delay: 1.5s; }
        .p5 { animation-delay: 2s; }

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

        /* STATS & LOGOS SECTION */
        .hero-stats-section {
          max-width: 1000px;
          margin: 40px auto 100px;
          padding: 0 2rem;
          text-align: center;
        }
        .hero-stats {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          padding-bottom: 40px;
          margin-bottom: 40px;
        }
        .stat-item h3 {
          font-size: 2.2rem;
          color: #ff9900;
          margin-bottom: 8px;
          font-weight: 700;
        }
        .stat-item p {
          font-size: 0.85rem;
          color: #888;
          font-weight: 500;
        }
        
        .hero-logos-wrapper {
          position: relative;
        }
        .logos-title {
          font-size: 0.8rem; color: #666; margin-bottom: 24px;
          position: relative; display: inline-block; background: #0d0d0d; padding: 0 16px;
          top: -50px; /* pull up into the border */
        }
        .hero-logos {
          display: flex; justify-content: center; gap: 40px; align-items: center;
          margin-bottom: 24px; flex-wrap: wrap; margin-top: -30px;
        }
        .logo-placeholder { font-size: 1.4rem; font-weight: 700; color: #555; letter-spacing: -0.03em; }
        .trust-badges {
          display: flex; justify-content: center; gap: 24px; font-size: 0.75rem; color: #777;
        }
        .dot-green { display: inline-block; width: 6px; height: 6px; background: #10b981; border-radius: 50%; margin-right: 6px; }

        /* FEATURES SECTION */
        .hero-features-section {
          max-width: 1100px; margin: 0 auto 100px; padding: 0 2rem;
          text-align: center;
        }
        .feature-badge {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1px solid rgba(255,153,0,0.3); background: rgba(255,153,0,0.05);
          color: #ffb74d; padding: 4px 12px; border-radius: 99px; font-size: 0.75rem; font-weight: 500;
          margin-bottom: 16px;
        }
        .feature-badge .dot { width: 6px; height: 6px; background: #ff9900; border-radius: 50%; }
        
        .features-title { font-size: 2.5rem; font-weight: 700; color: #fff; margin-bottom: 16px; letter-spacing: -0.02em; }
        .features-subtitle { font-size: 1rem; color: #888; margin-bottom: 40px; }

        .feature-tabs {
          display: flex; justify-content: center; gap: 12px; margin-bottom: 60px; flex-wrap: wrap;
        }
        .f-tab {
          background: #1a1a1a; border: 1px solid #333; color: #aaa;
          padding: 10px 20px; border-radius: 99px; font-size: 0.9rem; font-weight: 500; cursor: pointer;
          transition: all 0.2s;
        }
        .f-tab.hover-tab:hover { background: #222; color: #ccc; }
        .f-tab.active-tab { background: rgba(255,153,0,0.1); border-color: rgba(255,153,0,0.4); color: #ff9900; }

        .feature-content-grid {
          display: flex; align-items: center; justify-content: space-between; gap: 60px;
          text-align: left; background: linear-gradient(145deg, #111, #0a0a0a);
          border: 1px solid #222; border-radius: 24px; padding: 60px;
        }
        .fc-left { flex: 1; max-width: 400px; }
        .fc-mini-badge { 
          display: inline-block; background: rgba(255,153,0,0.15); color: #ffb74d; 
          padding: 4px 10px; border-radius: 6px; font-size: 0.7rem; font-weight: 600; margin-bottom: 16px;
        }
        .fc-left h3 { font-size: 2rem; color: #fff; margin-bottom: 12px; font-weight: 700; height: auto; }
        .fc-left p { color: #888; font-size: 1rem; line-height: 1.5; margin-bottom: 30px; }
        
        .fc-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 40px; }
        .fc-pill {
          background: #17171e; border: 1px solid #2a2a2a; color: #aaa; font-size: 0.8rem;
          padding: 10px 12px; border-radius: 8px; display: flex; align-items: center; gap: 8px;
        }
        .fc-check { color: #ff9900; font-weight: bold; background: rgba(255,153,0,0.15); width: 18px; height: 18px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.6rem; }
        
        .btn-feature-cta {
          background: #ff9900; color: #111; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; cursor: pointer; transition: 0.2s;
        }
        .btn-feature-cta:hover { background: #ffa629; }

        .fc-right { flex: 1; position: relative; display: flex; justify-content: flex-end; }
        .fc-mockup {
          position: relative; width: 100%; max-width: 460px; height: 380px;
        }
        .mockup-bg-element {
          position: absolute; right: -20px; top: -20px; width: 100%; height: 100%;
          background: #111115; border-radius: 16px; border: 1px solid #222;
        }
        .mockup-main-panel {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: #1e1e24; border-radius: 12px; border: 1px solid #333;
          box-shadow: 0 10px 40px rgba(0,0,0,0.8); overflow: hidden;
        }
        .panel-header {
          background: #18181d; padding: 12px 16px; display: flex; align-items: center; border-bottom: 1px solid #333;
        }
        .mac-dots { display: flex; gap: 6px; margin-right: 16px; }
        .mac-dots span { width: 10px; height: 10px; border-radius: 50%; background: #555; }
        .mac-dots span:nth-child(1) { background: #ff5f56; }
        .mac-dots span:nth-child(2) { background: #ffbd2e; }
        .mac-dots span:nth-child(3) { background: #27c93f; }
        .panel-header code { color: #888; font-size: 0.75rem; font-family: monospace; }
        
        .panel-body { padding: 16px; font-family: monospace; font-size: 0.8rem; line-height: 1.6; color: #abb2bf; }
        .code-line { display: flex; gap: 16px; align-items:flex-start;}
        .code-line span:first-child { color: #4b5263; user-select: none; text-align: right; min-width: 16px; }
        .highlight-line { background: rgba(255,153,0,0.08); margin: 0 -16px; padding: 0 16px; border-left: 2px solid #ff9900; }

        .floating-widget {
          position: absolute; left: -40px; top: 80px;
          background: #2a2a35; border: 1px solid #444; border-radius: 30px; padding: 8px 20px 8px 8px;
          display: flex; align-items: center; gap: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.5);
          animation: float 4s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .floating-widget img { width: 36px; height: 36px; border-radius: 50%; background: #444; }
        .floating-widget strong { display: block; font-size: 0.75rem; color: #fff; line-height: 1.2; }
        .floating-widget p { font-size: 0.65rem; color: #999; margin: 0; line-height: 1.2; }
        
        .floating-tools {
          position: absolute; right: 20px; top: 120px;
          background: #2a2a35; border: 1px solid #444; border-radius: 20px; padding: 10px;
          display: flex; flex-direction: column; gap: 12px; box-shadow: 0 8px 20px rgba(0,0,0,0.5);
        }
        .tool-circle { width: 16px; height: 16px; border-radius: 50%; border: 2px solid #2a2a35; box-shadow: 0 0 0 1px #444; }

        /* STEPS SECTION & FLOWCHART */
        .hero-steps-section {
          text-align: center; max-width: 1000px; margin: 0 auto 60px; padding: 0 2rem;
        }
        .hero-steps-section h2 { font-size: 2.2rem; color: #fff; margin-bottom: 16px; font-weight: 700; }
        .hero-steps-section p { color: #888; }

        .process-flowchart {
          display: flex; align-items: center; justify-content: center; margin: 60px 0; position: relative;
        }
        .flow-lines { width: 120px; height: 320px; opacity: 0.6; }
        .flow-lines.reverse { opacity: 0.6; }

        .node-box {
          background: #17171e; border: 1px solid #2a2a2a; border-radius: 12px;
          display: flex; align-items: center; padding: 16px 20px; gap: 16px;
          min-width: 220px; position: relative; text-align: left;
        }
        .node-box.small-node {
          padding: 10px 16px; min-width: 180px; gap: 12px; margin: 10px 0; background: #131317;
        }
        .node-box.active-node {
          border-color: rgba(255,153,0,0.5); background: rgba(255,153,0,0.05); 
          animation: glow 3s ease-in-out infinite;
        }
        .n-icon { width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
        .n-icon-small { width: 24px; height: 24px; font-size: 0.8rem; background: rgba(255,255,255,0.05); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
        
        .n-text h4 { font-size: 0.95rem; color: #fff; margin-bottom: 4px; font-weight: 600; }
        .n-text p { font-size: 0.75rem; color: #888; margin: 0; line-height: 1.3; }
        
        .small-node h5 { font-size: 0.8rem; color: #e5e5e5; margin-bottom: 2px; }
        .small-node p { font-size: 0.65rem; color: #666; margin: 0; }

        .connector-dot { position: absolute; width: 8px; height: 8px; background: #ff9900; border-radius: 50%; box-shadow: 0 0 10px #ff9900; }
        .connector-dot.right { right: -4px; top: 50%; transform: translateY(-50%); }
        .connector-dot.left { left: -4px; top: 50%; transform: translateY(-50%); }

        .flow-node { position: relative; }
        .node-num {
          position: absolute; top: -12px; left: -12px; width: 24px; height: 24px;
          background: #000; border: 1.5px solid #ff9900; color: #ff9900; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 800; z-index: 2;
        }
        .node-num.num-green { border-color: #10b981; color: #10b981; left: auto; right: -12px; }

        .flow-middle { display: flex; flex-direction: column; justify-content: center; }

        .process-cards {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 60px;
        }
        .p-card {
          background: #131317; border: 1px solid #222; border-radius: 16px; padding: 30px; text-align: left;
        }
        .pc-icon {
          width: 40px; height: 40px; background: rgba(255,255,255,0.05); border-radius: 10px; font-size: 1.2rem;
          display: flex; align-items: center; justify-content: center; margin-bottom: 20px; border: 1px solid #333;
        }
        .p-card h4 { font-size: 1.1rem; color: #fff; margin-bottom: 12px; font-weight: 600; }
        .p-card p { font-size: 0.85rem; color: #888; line-height: 1.5; }

        .process-cta-text { margin-top: 20px; font-size: 0.95rem; color: #aaa; text-align: center; }
        .process-cta-text p { margin-bottom: 16px; }

        /* PATTERN CTA SECTION */
        .hero-final-cta {
          padding: 100px 2rem; text-align: center; position: relative; overflow: hidden;
          background: #111;
          background-image: repeating-linear-gradient(45deg, rgba(255,153,0,0.03) 0, rgba(255,153,0,0.03) 2px, transparent 2px, transparent 12px);
          border-top: 1px solid #222;
        }
        .hero-final-cta h2 { font-size: 3rem; color: #fff; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 24px; }
        .hero-final-cta p { font-size: 1.1rem; color: #aaa; line-height: 1.6; max-width: 600px; margin: 0 auto; }
        
        .bottom-metrics {
          display: flex; justify-content: center; gap: 40px; border: 1px solid #333; background: #15151a;
          padding: 30px; border-radius: 16px; max-width: 800px; margin: 0 auto 60px; text-align: left;
        }
        .bm-item { display: flex; align-items: center; gap: 16px; }
        .bm-icon { width: 40px; height: 40px; background: rgba(255,153,0,0.1); border-radius: 10px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,153,0,0.2); }
        .bm-item strong { display: block; color: #fff; font-size: 0.95rem; margin-bottom: 4px; }
        .bm-item p { color: #888; font-size: 0.75rem; margin: 0; }



      `}</style>
    </div>
  );
}
