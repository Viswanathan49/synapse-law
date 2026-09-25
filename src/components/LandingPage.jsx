import React, { useEffect, useRef, useState } from 'react';
import './LandingPage.css';

const FEATURES = [
  {
    id: 'simplifier',
    icon: '📄',
    color: 'hsl(217, 91%, 60%)',
    glow: 'hsla(217, 91%, 60%, 0.25)',
    title: 'Document Simplifier',
    desc: 'Transform dense legalese into plain English instantly. ELI5, Executive Summary, and clause-by-clause breakdown modes.',
    tags: ['ELI5 Mode', 'Executive Summary', 'Clause Breakdown'],
  },
  {
    id: 'risk',
    icon: '🚨',
    color: 'hsl(0, 85%, 58%)',
    glow: 'hsla(0, 85%, 58%, 0.25)',
    title: 'Red-Flag Risk Radar',
    desc: 'AI-powered risk scoring (0–100) with Crimson/Amber/Emerald badges. Scans for auto-renewals, IP traps, indemnification clauses.',
    tags: ['Risk Score 0–100', 'Auto-Renewal Trap', 'IP Assignment'],
  },
  {
    id: 'compare',
    icon: '⚖️',
    color: 'hsl(258, 80%, 65%)',
    glow: 'hsla(258, 80%, 65%, 0.25)',
    title: 'Contract Comparator',
    desc: 'Visual diff viewer for two contract versions. Highlights added obligations, deleted rights, and liability shifts.',
    tags: ['Char-Level Diff', 'AI Semantic Analysis', 'Risk Shift Detection'],
  },
  {
    id: 'qa',
    icon: '💬',
    color: 'hsl(173, 80%, 45%)',
    glow: 'hsla(173, 80%, 45%, 0.25)',
    title: 'Grounded Q&A Engine',
    desc: 'Zero-hallucination Q&A with exact section numbers, page references, and direct verbatim quotes from your document.',
    tags: ['Zero Hallucination', 'Direct Quotes', 'Section References'],
  },
  {
    id: 'brief',
    icon: '📋',
    color: 'hsl(38, 95%, 55%)',
    glow: 'hsla(38, 95%, 55%, 0.25)',
    title: 'Lawyer Brief Generator',
    desc: 'Export a structured attorney consultation brief with top risks, missing provisions, and questions — as PDF or PowerPoint.',
    tags: ['Export PDF', 'Export PowerPoint', 'Attorney Questions'],
  },
];

const STATS = [
  { value: '15+', label: 'Risk Clause Types' },
  { value: '0', label: 'Hallucinations Tolerated' },
  { value: '3', label: 'Export Formats' },
  { value: '100%', label: 'Client-Side PII Safety' },
];

const STEPS = [
  { num: '01', title: 'Upload Your Document', desc: 'Drop a PDF, DOCX, or image — or paste text directly. Supports scanned documents via AI Vision.' },
  { num: '02', title: 'AI Analyzes & Grounds', desc: 'Gemini 1.5 Pro reads every clause, grounding all answers in exact section references and direct quotes.' },
  { num: '03', title: 'Detect Risks & Simplify', desc: 'Red-flag scanner identifies predatory clauses. Simplifier translates legalese into plain English instantly.' },
  { num: '04', title: 'Export Your Brief', desc: 'Generate a polished lawyer preparation brief and export as a branded PDF or 10-slide PowerPoint deck.' },
];

function AnimatedCounter({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const numTarget = parseInt(target, 10);
        if (isNaN(numTarget)) { setCount(target); return; }
        let start = 0;
        const duration = 1200;
        const step = (timestamp) => {
          if (!step.startTime) step.startTime = timestamp;
          const progress = Math.min((timestamp - step.startTime) / duration, 1);
          setCount(Math.floor(progress * numTarget));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{typeof count === 'string' ? count : count}{suffix}</span>;
}

function LandingPage({ onEnterApp, onOpenAuthModal, currentUser, onSelectFeature }) {
  const heroRef = useRef(null);

  useEffect(() => {
    const handleMouse = (e) => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      heroRef.current.style.setProperty('--mx', `${x}%`);
      heroRef.current.style.setProperty('--my', `${y}%`);
    };
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, []);

  const handleFeatureClick = (featureId) => {
    if (typeof onSelectFeature === 'function') {
      onSelectFeature(featureId);
    } else {
      onEnterApp();
    }
  };

  return (
    <div className="landing">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <span className="landing-logo-icon">⚖️</span>
            <span className="landing-logo-text">LexiGuard AI</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#safety">Safety</a>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              id="nav-auth-portal"
              className="btn btn-secondary btn-sm"
              onClick={onOpenAuthModal}
              aria-label="Open Secured Vault Login Portal"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{currentUser ? currentUser.avatar || '👤' : '🔐'}</span>
              <span>{currentUser ? currentUser.name : 'Vault Login'}</span>
            </button>
            <button id="nav-enter-app" className="btn btn-primary btn-sm" onClick={onEnterApp} aria-label="Launch Workspace">
              Launch Workspace →
            </button>
          </div>
        </div>
      </nav>

      <main id="main-content" tabIndex="-1">
        {/* ── Hero ── */}
        <section className="hero" ref={heroRef} id="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-glow hero-glow-3" />
        <div className="hero-grid" />

        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            Powered by Google Gemini 1.5 Pro
          </div>

          <h1 className="hero-title">
            Legal Intelligence,<br />
            <span className="hero-title-gradient">Without the Jargon</span>
          </h1>

          <p className="hero-subtitle">
            Upload any contract, lease, or terms of service. LexiGuard AI simplifies it,
            scores its risk, compares versions, and prepares you for your attorney — all
            with zero hallucinations and full PII protection.
          </p>

          <div className="hero-actions">
            <button id="hero-enter-app" className="btn btn-primary btn-lg hero-cta" onClick={onEnterApp}>
              ⚡ Analyze Your Contract Free
            </button>
            <a href="#features" className="btn btn-secondary btn-lg">
              See Features ↓
            </a>
          </div>

          <div className="hero-disclaimer">
            <span>⚠️</span>
            <span>Not Professional Legal Advice — For Informational Purposes Only</span>
          </div>

          {/* Risk Badge Preview */}
          <div className="hero-badges">
            <span className="badge badge-crimson badge-pulse">🔴 HIGH RISK</span>
            <span className="badge badge-amber">🟡 MEDIUM RISK</span>
            <span className="badge badge-emerald">🟢 LOW RISK</span>
          </div>
        </div>

        {/* Floating card */}
        <div className="hero-card-float">
          <div className="hero-card glass-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>Risk Analysis</span>
              <span className="badge badge-crimson badge-pulse">HIGH RISK</span>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Overall Risk Score</span>
                <span style={{ color: 'var(--risk-crimson)', fontWeight: 700 }}>82/100</span>
              </div>
              <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: '82%', height: '100%', background: 'var(--risk-crimson)', borderRadius: '3px', boxShadow: '0 0 8px var(--risk-crimson-glow)', transition: 'width 1.5s ease' }} />
              </div>
            </div>
            {[
              { type: 'AUTO_RENEWAL', ref: 'Section 2', severity: 'crimson' },
              { type: 'INDEMNIFICATION', ref: 'Section 7', severity: 'crimson' },
              { type: 'UNILATERAL AMENDMENT', ref: 'Section 8', severity: 'amber' },
            ].map((flag, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', marginBottom: '6px', borderLeft: `2px solid var(--risk-${flag.severity})` }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{flag.type}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{flag.ref}</div>
                </div>
                <span className={`badge badge-${flag.severity}`} style={{ fontSize: '0.65rem' }}>{flag.severity.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-bar">
        {STATS.map((s, i) => (
          <div key={i} className="stat-item">
            <div className="stat-value">
              <AnimatedCounter target={s.value} />
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section className="section" id="features">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Features</span>
            <h2 className="section-title">Everything you need to understand any contract</h2>
            <p className="section-subtitle">Click any feature box below to launch directly into that AI module</p>
          </div>

          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.id}
                id={`feature-box-${f.id}`}
                className="feature-card glass-card feature-card-interactive"
                role="button"
                tabIndex={0}
                aria-label={`Open ${f.title} module`}
                onClick={() => handleFeatureClick(f.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleFeatureClick(f.id);
                  }
                }}
                style={{ '--feature-color': f.color, '--feature-glow': f.glow, animationDelay: `${i * 0.08}s` }}
              >
                <div className="feature-icon-wrap">
                  <span className="feature-icon">{f.icon}</span>
                  <div className="feature-icon-glow" />
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
                <div className="feature-tags">
                  {f.tags.map(tag => (
                    <span key={tag} className="feature-tag">{tag}</span>
                  ))}
                </div>
                <div className="feature-card-cta">
                  <span>Launch Module</span>
                  <span className="feature-card-cta-arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="section section-alt" id="how-it-works">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Process</span>
            <h2 className="section-title">From upload to brief in minutes</h2>
            <p className="section-subtitle">A streamlined workflow powered by Google Gemini's 1M token context window</p>
          </div>

          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={i} className="step-card glass-card">
                <div className="step-num">{step.num}</div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-desc">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety ── */}
      <section className="section" id="safety">
        <div className="section-inner">
          <div className="section-header">
            <span className="section-tag">Safety & Privacy</span>
            <h2 className="section-title">Your data is protected before it ever reaches AI</h2>
          </div>

          <div className="safety-grid">
            {[
              {
                icon: '🛡️',
                title: 'Client-Side PII Scrubbing',
                desc: 'SSNs, emails, phone numbers, addresses, and credit card numbers are automatically redacted before any AI API call. Your sensitive data never leaves your browser unprotected.',
                color: 'var(--risk-emerald)',
              },
              {
                icon: '🚫',
                title: 'Zero-Hallucination Guard',
                desc: 'Every AI answer is validated for direct quotes and section references. Responses without verifiable citations are flagged. Trick questions trigger explicit "not found" responses.',
                color: 'var(--brand-primary)',
              },
              {
                icon: '⚖️',
                title: 'Mandatory Disclaimers',
                desc: 'Every screen prominently displays the "Not Professional Legal Advice" disclaimer. AI-generated analysis is always framed as informational, never as legal counsel.',
                color: 'var(--risk-amber)',
              },
            ].map((item, i) => (
              <div key={i} className="safety-card glass-card" style={{ '--safety-color': item.color }}>
                <div className="safety-icon">{item.icon}</div>
                <h3 className="safety-title">{item.title}</h3>
                <p className="safety-desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── File Format Support ── */}
      <section className="formats-section">
        <div className="section-inner" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>Supported Formats</p>
          <div className="formats-row">
            {[
              { icon: '📄', label: 'PDF' },
              { icon: '📝', label: 'DOCX' },
              { icon: '🖼️', label: 'PNG / JPG' },
              { icon: '🌐', label: 'WEBP' },
              { icon: '📷', label: 'TIFF' },
              { icon: '✏️', label: 'Paste Text' },
            ].map((f, i) => (
              <div key={i} className="format-chip">
                <span>{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section">
        <div className="cta-glow cta-glow-1" />
        <div className="cta-glow cta-glow-2" />
        <div className="cta-inner">
          <h2 className="cta-title">Ready to decode your contract?</h2>
          <p className="cta-subtitle">
            Upload any legal document and get an AI-powered risk analysis, plain-English translation,<br />
            and lawyer preparation brief — all in one place.
          </p>
          <button id="cta-enter-app" className="btn btn-primary btn-lg cta-btn" onClick={onEnterApp}>
            ⚡ Launch LexiGuard AI Free
          </button>
          <p className="cta-disclaimer">⚠️ Not Professional Legal Advice — Consult a Qualified Attorney for Legal Guidance</p>
        </div>
      </section>
      </main>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="section-inner">
          <div className="footer-inner">
            <div className="landing-logo">
              <span className="landing-logo-icon">⚖️</span>
              <span className="landing-logo-text">LexiGuard AI</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Powered by Google Gemini 1.5 Pro · Built for the GenAI Hackathon
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '4px' }}>
              ⚠️ For informational purposes only. Not professional legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
