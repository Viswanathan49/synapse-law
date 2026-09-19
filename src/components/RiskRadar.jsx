import React, { useState, useEffect } from 'react';
import { scanRisks } from '../services/legalAiService.js';
import { scoreRisk, severityToBadge } from '../utils/riskScorer.js';
import RiskBadge from './RiskBadge.jsx';
import RiskMatrixChart from './RiskMatrixChart.jsx';
import RedlineCopilot from './RedlineCopilot.jsx';

function RiskGauge({ score, level }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const colorMap = { high: 'var(--risk-crimson)', medium: 'var(--risk-amber)', low: 'var(--risk-emerald)' };
  const color = colorMap[level] || 'var(--risk-amber)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={`Risk score ${score} out of 100`}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="26" fontWeight="800" fontFamily="Inter">{score}</text>
        <text x="70" y="82" textAnchor="middle" fill="var(--text-muted)" fontSize="10" fontFamily="Inter">/ 100</text>
      </svg>
      <RiskBadge level={level} label={level === 'high' ? 'High Risk' : level === 'medium' ? 'Medium Risk' : 'Low Risk'} pulse={level === 'high'} size="lg" />
    </div>
  );
}

function RiskFlagCard({ flag, index, onOpenRedline, documentText }) {
  const [expanded, setExpanded] = useState(false);
  const badge = severityToBadge(flag.severity);
  const borderColor = { crimson: 'var(--risk-crimson)', amber: 'var(--risk-amber)', emerald: 'var(--risk-emerald)' }[badge];

  return (
    <div
      className="glass-card animate-fadeInUp"
      style={{ borderLeft: `3px solid ${borderColor}`, animationDelay: `${index * 0.07}s`, overflow: 'hidden' }}
    >
      <button
        id={`risk-flag-${index}`}
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{ width: '100%', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: '12px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            #{index + 1}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '2px' }}>
              {flag.type?.replace(/_/g, ' ') || 'Risk Clause'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{flag.sectionRef}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <RiskBadge level={flag.severity} />
          <span style={{ color: 'var(--text-muted)', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          {flag.directQuote && (
            <blockquote className="quote-block" style={{ marginTop: '14px' }}>
              "{flag.directQuote}"
            </blockquote>
          )}
          <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.7 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Why it's risky: </strong>
              {flag.explanation}
            </p>
            {flag.recommendation && (
              <div style={{ padding: '12px', background: 'hsla(217,91%,60%,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid hsla(217,91%,60%,0.2)' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--brand-primary)' }}>
                  💡 <strong>Recommendation:</strong> {flag.recommendation}
                </p>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenRedline(flag)}
                style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                aria-label={`Generate AI Redline Counter-Clause for ${flag.type}`}
              >
                ⚡ Generate AI Redline Counter-Clause
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RiskRadar({ documentText, onRiskData }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeRedlineFlag, setActiveRedlineFlag] = useState(null);

  // Deterministic pre-score
  const preScore = documentText ? scoreRisk(documentText) : null;

  async function handleScan() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await scanRisks(documentText);
      setResult(data);
      onRiskData?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const displayScore = result?.overallScore ?? preScore?.score ?? 0;
  const displayLevel = result?.riskLevel ?? preScore?.level ?? 'low';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Gauge + Scan Button */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <h3>🚨 Red-Flag Risk Radar</h3>

        <RiskGauge score={displayScore} level={displayLevel} />

        {preScore && !result && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Pre-scan estimate: {preScore.detectedClauses.length} risk clauses detected
          </p>
        )}

        <button
          id="risk-scan-btn"
          className="btn btn-primary btn-lg"
          style={{ width: '100%', maxWidth: '280px' }}
          onClick={handleScan}
          disabled={loading || !documentText}
        >
          {loading ? <><span className="spinner" /> Deep AI Scan...</> : '🔍 Run Deep Risk Scan'}
        </button>

        {result?.scoreExplanation && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '480px' }}>
            {result.scoreExplanation}
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" id="risk-disclaimer">
        <span className="disclaimer-icon">⚠️</span>
        Not Professional Legal Advice — For Informational Purposes Only
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--risk-crimson)' }}>
          <p style={{ color: 'var(--risk-crimson)' }}>❌ {error}</p>
          <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={handleScan}>Retry</button>
        </div>
      )}

      {/* 4-Dimension Risk Matrix Chart */}
      {documentText && (
        <RiskMatrixChart riskData={result} documentText={documentText} />
      )}

      {/* Results */}
      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ color: 'var(--text-secondary)' }}>{result.flags?.length || 0} Risk Flags Found</h4>

          {result.flags?.map((flag, i) => (
            <RiskFlagCard
              key={i}
              flag={flag}
              index={i}
              onOpenRedline={(f) => setActiveRedlineFlag(f)}
              documentText={documentText}
            />
          ))}

          {/* Missing Protections */}
          {result.missingProtections?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ marginBottom: '14px', color: 'var(--risk-amber)' }}>⚠️ Missing Protections</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.missingProtections.map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', background: 'var(--risk-amber-bg)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--risk-amber)' }}>✗</span>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{p}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Redline Counter-Clause Copilot Modal */}
      {activeRedlineFlag && (
        <RedlineCopilot
          riskFlag={activeRedlineFlag}
          documentText={documentText}
          onClose={() => setActiveRedlineFlag(null)}
        />
      )}
    </div>
  );
}

export default RiskRadar;
