import React, { useState } from 'react';
import { simplifyDocument } from '../services/legalAiService.js';
import RiskBadge from './RiskBadge.jsx';
import VoiceBriefPlayer from './VoiceBriefPlayer.jsx';

const MODES = [
  { id: 'clauses', label: '⚖️ Clause Breakdown', desc: 'Side-by-side legal vs plain English' },
  { id: 'executive', label: '📊 Executive Summary', desc: 'Key facts for decision makers' },
  { id: 'eli5', label: '🧒 ELI5 Mode', desc: 'Explain like I\'m 5' },
];

const LANGUAGES = [
  { code: 'en', label: '🇺🇸 English' },
  { code: 'es', label: '🇪🇸 Spanish (Español)' },
  { code: 'fr', label: '🇫🇷 French (Français)' },
  { code: 'de', label: '🇩🇪 German (Deutsch)' },
  { code: 'hi', label: '🇮🇳 Hindi (हिन्दी)' },
  { code: 'ja', label: '🇯🇵 Japanese (日本語)' },
];

function LoadingSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton" style={{ height: '72px', animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

function SimplifierView({ documentText }) {
  const [mode, setMode] = useState('clauses');
  const [language, setLanguage] = useState('en');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await simplifyDocument(documentText, mode, language);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Mode Selector & Language Bar */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>Analysis Mode</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Target Language:</span>
            <select
              className="select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8125rem' }}
              aria-label="Select Target Translation Language"
            >
              {LANGUAGES.map(l => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              id={`simplify-mode-${m.id}`}
              onClick={() => setMode(m.id)}
              aria-label={`Select ${m.label} mode`}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${mode === m.id ? 'var(--brand-primary)' : 'var(--border-default)'}`,
                background: mode === m.id ? 'hsla(217,91%,60%,0.1)' : 'var(--glass-bg)',
                color: mode === m.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all var(--transition-base)',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '4px' }}>{m.label}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{m.desc}</div>
            </button>
          ))}
        </div>
        <button
          id="simplify-analyze-btn"
          className="btn btn-primary"
          style={{ marginTop: '16px', width: '100%' }}
          onClick={handleAnalyze}
          disabled={loading || !documentText}
        >
          {loading ? <><span className="spinner" /> Simplifying & Translating...</> : '✨ Simplify Document'}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" id="simplifier-disclaimer">
        <span className="disclaimer-icon">⚠️</span>
        Not Professional Legal Advice — For Informational Purposes Only
      </div>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--risk-crimson)' }}>
          <p style={{ color: 'var(--risk-crimson)' }}>❌ {error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={handleAnalyze}>Retry</button>
        </div>
      )}

      {result && !loading && (
        <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Executive Voice Briefing Component */}
          <VoiceBriefPlayer
            summaryText={result.summary}
            topRisks={result.clauses?.filter(c => c.riskNote)}
          />
          {/* Document Header */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ marginBottom: '4px' }}>{result.documentTitle}</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{result.documentType}</span>
              </div>
            </div>
            {result.summary && (
              <p style={{ marginTop: '14px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
                {result.summary}
              </p>
            )}
            {result.keyParties?.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.keyParties.map((p, i) => (
                  <span key={i} style={{ padding: '4px 10px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', border: '1px solid var(--border-subtle)' }}>
                    👤 {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Financial Terms */}
          {result.financialTerms?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ marginBottom: '12px' }}>💰 Financial Terms</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.financialTerms.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ color: 'var(--risk-amber)', fontSize: '0.875rem' }}>$</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Dates */}
          {result.criticalDates?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ marginBottom: '12px' }}>📅 Critical Dates</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {result.criticalDates.map((d, i) => (
                  <span key={i} style={{ padding: '6px 12px', background: 'hsla(217,91%,60%,0.1)', borderRadius: 'var(--radius-full)', fontSize: '0.8125rem', color: 'var(--brand-primary)', border: '1px solid hsla(217,91%,60%,0.2)' }}>
                    📅 {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Clause Breakdown */}
          {result.clauses?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ marginBottom: '16px' }}>📜 Clause Analysis</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Legal Text</div>
                <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Plain English</div>
                {result.clauses.map((clause, i) => (
                  <React.Fragment key={i}>
                    <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginBottom: '6px', fontWeight: 600 }}>{clause.sectionRef} — {clause.clauseTitle}</div>
                      <p className="font-mono" style={{ fontSize: '0.8125rem', lineHeight: 1.6 }}>{clause.originalText}</p>
                    </div>
                    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
                      <p style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>{clause.plainEnglish}</p>
                      {clause.riskNote && (
                        <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--risk-amber-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', color: 'var(--risk-amber)' }}>
                          ⚠️ {clause.riskNote}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SimplifierView;
