import React, { useState } from 'react';
import { compareContracts } from '../services/legalAiService.js';
import { DiffMatchPatch } from 'diff-match-patch';
import RiskBadge from './RiskBadge.jsx';

function CharDiff({ textA, textB }) {
  const dmp = new DiffMatchPatch();
  const diffs = dmp.diff_main(textA || '', textB || '');
  dmp.diff_cleanupSemantic(diffs);

  return (
    <div className="font-mono" style={{ fontSize: '0.8125rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {diffs.map(([op, text], i) => {
        if (op === 0) return <span key={i} className="diff-neutral">{text}</span>;
        if (op === 1) return <span key={i} className="diff-added" style={{ padding: '1px 2px', borderRadius: '2px' }}>{text}</span>;
        if (op === -1) return <span key={i} className="diff-removed" style={{ padding: '1px 2px', borderRadius: '2px' }}>{text}</span>;
        return null;
      })}
    </div>
  );
}

function ContractComparator({ documentText }) {
  const [textA, setTextA] = useState(documentText || '');
  const [textB, setTextB] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDiff, setShowDiff] = useState(false);

  const directionColors = { improved: 'var(--risk-emerald)', worsened: 'var(--risk-crimson)', neutral: 'var(--text-muted)' };
  const directionIcons = { improved: '📈', worsened: '📉', neutral: '➡️' };

  async function handleCompare() {
    if (!textA.trim() || !textB.trim()) {
      setError('Please provide both contracts to compare.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await compareContracts(textA, textB);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Input Panel */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>⚖️ Contract Comparator</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              📄 Contract A (Original / Version 1)
            </label>
            <textarea
              id="comparator-text-a"
              className="textarea"
              value={textA}
              onChange={e => setTextA(e.target.value)}
              style={{ minHeight: '180px' }}
              placeholder="Paste Contract A here..."
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
              📄 Contract B (Revised / Version 2)
            </label>
            <textarea
              id="comparator-text-b"
              className="textarea"
              value={textB}
              onChange={e => setTextB(e.target.value)}
              style={{ minHeight: '180px' }}
              placeholder="Paste Contract B here..."
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            id="comparator-analyze-btn"
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleCompare}
            disabled={loading || !textA.trim() || !textB.trim()}
          >
            {loading ? <><span className="spinner" /> Comparing...</> : '🔍 Compare Contracts'}
          </button>
          <button
            id="comparator-diff-toggle"
            className={`btn btn-secondary ${showDiff ? 'active' : ''}`}
            onClick={() => setShowDiff(!showDiff)}
            style={{ border: showDiff ? '1px solid var(--brand-primary)' : undefined }}
          >
            {showDiff ? '🔤 Hide Diff' : '🔤 Show Char Diff'}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" id="comparator-disclaimer">
        <span className="disclaimer-icon">⚠️</span>
        Not Professional Legal Advice — For Informational Purposes Only
      </div>

      {/* Character-level Diff */}
      {showDiff && textA && textB && (
        <div className="glass-card" style={{ padding: '20px' }}>
          <h4 style={{ marginBottom: '14px' }}>🔤 Character-Level Diff</h4>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span className="badge badge-emerald">Green = Added in B</span>
            <span className="badge badge-crimson">Red = Removed from A</span>
          </div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', padding: '16px', maxHeight: '320px', overflowY: 'auto' }}>
            <CharDiff textA={textA.slice(0, 10000)} textB={textB.slice(0, 10000)} />
          </div>
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--risk-crimson)' }}>
          <p style={{ color: 'var(--risk-crimson)' }}>❌ {error}</p>
        </div>
      )}

      {/* AI Comparison Results */}
      {result && !loading && (
        <div className="animate-fadeInUp" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Verdict */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '1.5rem' }}>{directionIcons[result.riskShiftDirection] || '➡️'}</span>
              <h4 style={{ color: directionColors[result.riskShiftDirection] }}>
                {result.riskShiftDirection === 'improved' ? 'Version B is More Favorable' :
                 result.riskShiftDirection === 'worsened' ? 'Version B is Less Favorable' :
                 'Neutral Change'}
              </h4>
            </div>
            <p>{result.overallVerdict}</p>
          </div>

          {/* Added Obligations */}
          {result.addedObligations?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px', borderLeft: '3px solid var(--risk-crimson)' }}>
              <h4 style={{ marginBottom: '14px', color: 'var(--risk-crimson)' }}>
                ➕ New Obligations Added ({result.addedObligations.length})
              </h4>
              {result.addedObligations.map((item, i) => (
                <div key={i} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: i < result.addedObligations.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginBottom: '6px', fontWeight: 600 }}>{item.section}</div>
                  <blockquote className="quote-block">{item.text}</blockquote>
                  <p style={{ fontSize: '0.875rem', color: 'var(--risk-crimson)', marginTop: '8px' }}>⚠️ {item.riskImpact}</p>
                </div>
              ))}
            </div>
          )}

          {/* Deleted Rights */}
          {result.deletedRights?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px', borderLeft: '3px solid var(--risk-amber)' }}>
              <h4 style={{ marginBottom: '14px', color: 'var(--risk-amber)' }}>
                ➖ Rights Removed ({result.deletedRights.length})
              </h4>
              {result.deletedRights.map((item, i) => (
                <div key={i} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: i < result.deletedRights.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginBottom: '6px', fontWeight: 600 }}>{item.section}</div>
                  <blockquote className="quote-block" style={{ textDecoration: 'line-through', opacity: 0.7 }}>{item.text}</blockquote>
                  <p style={{ fontSize: '0.875rem', color: 'var(--risk-amber)', marginTop: '8px' }}>📋 {item.impact}</p>
                </div>
              ))}
            </div>
          )}

          {/* Risk Shifts */}
          {result.riskShifts?.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h4 style={{ marginBottom: '14px' }}>⚡ Risk Shifts</h4>
              {result.riskShifts.map((shift, i) => (
                <div key={i} style={{ marginBottom: '14px', padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{shift.clause}</strong>
                    <RiskBadge level={shift.severity} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '4px' }}>VERSION A</div>
                      <p style={{ fontSize: '0.8125rem' }}>{shift.versionA}</p>
                    </div>
                    <span style={{ fontSize: '1.2rem' }}>→</span>
                    <div style={{ padding: '10px', background: 'var(--risk-crimson-bg)', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--risk-crimson)', marginBottom: '4px' }}>VERSION B</div>
                      <p style={{ fontSize: '0.8125rem' }}>{shift.versionB}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ContractComparator;
