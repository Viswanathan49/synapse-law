import React, { useState } from 'react';
import { authService } from '../services/authService.js';
import './BatchComparatorModal.css';

function BatchComparatorModal({ isOpen, onClose, user, onLoadDocument }) {
  const [copiedCSV, setCopiedCSV] = useState(false);

  if (!isOpen || !user) return null;

  const memories = authService.getSavedMemories(user.id);

  function exportPortfolioCSV() {
    if (memories.length === 0) return;
    let csv = 'Filename,DocType,RiskScore,RiskLevel,AutoRenewal,Indemnification,SavedDate\n';
    memories.forEach(m => {
      const autoRenew = (m.riskHighlights || []).some(h => h.toLowerCase().includes('renewal')) ? 'Yes' : 'No';
      const indemn = (m.riskHighlights || []).some(h => h.toLowerCase().includes('indemn')) ? 'Yes' : 'No';
      csv += `"${m.filename}","${m.docType || 'pdf'}",${m.overallRiskScore || 0},"${m.riskLevel || 'SCANNED'}","${autoRenew}","${indemn}","${m.savedAt}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user.name.replace(/\s+/g, '_')}_Portfolio_Risk_Audit.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedCSV(true);
    setTimeout(() => setCopiedCSV(false), 2500);
  }

  return (
    <div className="batch-modal-backdrop animate-fadeIn" role="dialog" aria-modal="true" aria-label="Portfolio Batch Risk Audit">
      <div className="batch-modal-card glass-card animate-fadeInUp">
        {/* Header */}
        <div className="batch-modal-header">
          <div className="batch-user-pill">
            <span className="batch-user-avatar">📊</span>
            <div>
              <div className="batch-modal-title">Portfolio Batch Risk Audit</div>
              <div className="batch-modal-sub">
                Side-by-side comparative risk audit for {user.name}'s {memories.length} vault contracts
              </div>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} aria-label="Close Audit Modal">✕</button>
        </div>

        {/* Portfolio Summary Bar */}
        <div className="batch-summary-row">
          <div className="batch-summary-stat">
            <span className="batch-stat-val">{memories.length}</span>
            <span className="batch-stat-lbl">Audited Vault Contracts</span>
          </div>
          <div className="batch-summary-stat">
            <span className="batch-stat-val text-crimson">
              {memories.filter(m => (m.overallRiskScore || 0) >= 70).length}
            </span>
            <span className="batch-stat-lbl">High Risk Documents</span>
          </div>
          <div className="batch-summary-stat">
            <span className="batch-stat-val text-amber">
              {memories.filter(m => (m.riskHighlights || []).some(h => h.toLowerCase().includes('renewal'))).length}
            </span>
            <span className="batch-stat-lbl">Auto-Renewal Traps</span>
          </div>
          <div className="batch-summary-stat">
            <span className="batch-stat-val text-brand">
              {memories.length > 0 ? Math.round(memories.reduce((acc, m) => acc + (m.overallRiskScore || 0), 0) / memories.length) : 0}/100
            </span>
            <span className="batch-stat-lbl">Portfolio Avg Risk Score</span>
          </div>
        </div>

        {/* Audit Table */}
        <div className="batch-table-wrap">
          {memories.length === 0 ? (
            <div className="batch-empty">
              <span style={{ fontSize: '2rem' }}>📂</span>
              <p>No saved contract memories found in your vault. Save documents from the Legal Dashboard to compare portfolio risk.</p>
            </div>
          ) : (
            <table className="batch-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Type</th>
                  <th>Risk Rating</th>
                  <th>Auto-Renewal</th>
                  <th>Indemnification</th>
                  <th>Saved Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {memories.map(m => {
                  const hasAutoRenew = (m.riskHighlights || []).some(h => h.toLowerCase().includes('renewal'));
                  const hasIndemn = (m.riskHighlights || []).some(h => h.toLowerCase().includes('indemn'));
                  const isHigh = (m.overallRiskScore || 0) >= 70;
                  const isMed = (m.overallRiskScore || 0) >= 40 && !isHigh;

                  return (
                    <tr key={m.id}>
                      <td className="font-semibold text-primary">
                        <span style={{ marginRight: '6px' }}>{m.docType === 'pdf' ? '📄' : '📝'}</span>
                        {m.filename}
                      </td>
                      <td className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>
                        {m.docType || 'pdf'}
                      </td>
                      <td>
                        <span className={`badge badge-${isHigh ? 'crimson' : isMed ? 'amber' : 'emerald'}`}>
                          {m.overallRiskScore || 0}/100 {isHigh ? 'HIGH' : isMed ? 'MED' : 'LOW'}
                        </span>
                      </td>
                      <td>
                        {hasAutoRenew ? (
                          <span className="badge badge-crimson" style={{ fontSize: '0.65rem' }}>🔴 TRAPPED</span>
                        ) : (
                          <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>🟢 SAFE</span>
                        )}
                      </td>
                      <td>
                        {hasIndemn ? (
                          <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>🟡 UNCAPPED</span>
                        ) : (
                          <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>🟢 CAPPED</span>
                        )}
                      </td>
                      <td className="text-xs text-muted">
                        {new Date(m.savedAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            onLoadDocument({
                              filename: m.filename,
                              sourceType: m.docType || 'pdf',
                              pageCount: m.pageCount || 1,
                              text: m.sampleText || `CONTRACT: ${m.filename}\n\n${m.eli5Summary}`,
                              savedMemory: m
                            });
                            onClose();
                          }}
                          style={{ fontSize: '0.75rem', color: 'var(--brand-primary)' }}
                        >
                          Load →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="batch-modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Audit
          </button>
          {memories.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={exportPortfolioCSV}>
              {copiedCSV ? '✓ Exported CSV!' : '📥 Export Portfolio CSV'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BatchComparatorModal;
