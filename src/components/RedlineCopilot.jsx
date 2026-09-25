import React, { useState } from 'react';
import { generateRedlineClause } from '../services/legalAiService.js';
import './RedlineCopilot.css';

function RedlineCopilot({ riskFlag, documentText, onClose }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [redlineResult, setRedlineResult] = useState(null);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    if (riskFlag) {
      handleGenerate();
    }
  }, [riskFlag]);

  async function handleGenerate() {
    setIsGenerating(true);
    try {
      const result = await generateRedlineClause(riskFlag, documentText);
      setRedlineResult(result);
    } catch (err) {
      console.error('[RedlineCopilot] Generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleCopy() {
    if (!redlineResult?.proposedClause) return;
    navigator.clipboard.writeText(redlineResult.proposedClause);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!riskFlag) return null;

  return (
    <div className="redline-backdrop animate-fadeIn" role="dialog" aria-modal="true" aria-label="AI Clause Redline Copilot">
      <div className="redline-card glass-card animate-fadeInUp">
        {/* Header */}
        <div className="redline-header">
          <div className="redline-title-wrap">
            <span className="redline-badge-icon">⚡</span>
            <div>
              <h3 className="redline-title">AI Counter-Clause Redline Copilot</h3>
              <p className="redline-sub">Generates a balanced, lawyer-approved counter-proposal for negotiation</p>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close Redline Modal">✕</button>
        </div>

        {/* Flag Summary Banner */}
        <div className="redline-flag-banner">
          <span className="badge badge-crimson">{riskFlag.severity ? riskFlag.severity.toUpperCase() : 'HIGH RISK'}</span>
          <span className="redline-flag-type">{riskFlag.type || 'RISK FLAG'}</span>
          <span className="redline-flag-ref">({riskFlag.sectionRef || 'Section Clause'})</span>
        </div>

        {/* Loading State */}
        {isGenerating ? (
          <div className="redline-loading">
            <span className="spinner" style={{ width: '28px', height: '28px' }} />
            <div style={{ marginTop: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Drafting Lawyer-Balanced Counter-Clause...
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Optimizing risk allocation and crafting negotiation leverage commentary
            </div>
          </div>
        ) : redlineResult ? (
          <div className="redline-body">
            {/* Comparison Grid */}
            <div className="redline-comparison-grid">
              {/* Original Clause */}
              <div className="redline-box redline-box-original">
                <div className="redline-box-header">
                  <span>🔴 Original Risky Provision</span>
                  <span className="text-xs text-muted">{riskFlag.sectionRef}</span>
                </div>
                <div className="redline-box-text quote-block diff-removed">
                  "{redlineResult.originalQuote || riskFlag.directQuote}"
                </div>
                <p className="redline-box-hint text-crimson">
                  ⚠️ Risk: {redlineResult.riskExplanation || riskFlag.explanation}
                </p>
              </div>

              {/* Proposed Redlined Clause */}
              <div className="redline-box redline-box-proposed">
                <div className="redline-box-header">
                  <span>🟢 Proposed Redlined Counter-Clause</span>
                  <span className="badge badge-emerald">BALANCED</span>
                </div>
                <div className="redline-box-text quote-block diff-added">
                  "{redlineResult.proposedClause}"
                </div>
                <div className="redline-leverage-box">
                  <strong>💡 Negotiation Strategy & Leverage:</strong>
                  <p>{redlineResult.negotiationStrategy}</p>
                </div>
              </div>
            </div>

            {/* Key Modifications Summary */}
            {redlineResult.keyChanges && redlineResult.keyChanges.length > 0 && (
              <div className="redline-changes">
                <div className="redline-changes-title">✨ Key Redline Modifications Made:</div>
                <ul className="redline-changes-list">
                  {redlineResult.keyChanges.map((change, idx) => (
                    <li key={idx}>✓ {change}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}

        {/* Modal Footer */}
        <div className="redline-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Redline
          </button>
          {redlineResult && (
            <button
              className="btn btn-primary btn-sm"
              onClick={handleCopy}
            >
              {copied ? '✓ Copied to Clipboard!' : '📋 Copy Counter-Clause'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default RedlineCopilot;
