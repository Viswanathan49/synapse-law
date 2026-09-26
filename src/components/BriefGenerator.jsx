import React, { useState, useRef } from 'react';
import { generateBrief } from '../services/legalAiService.js';
import { exportToPDF, exportToPPT } from '../services/exportService.js';
import RiskBadge from './RiskBadge.jsx';

function BriefGenerator({ documentText, riskData }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null); // 'pdf' | 'ppt'
  const [error, setError] = useState(null);
  const briefRef = useRef(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setBrief(null);
    try {
      const data = await generateBrief(documentText, riskData);
      setBrief(data);
    } catch (err) {
      console.error('[Synapse Law] Brief generation error:', err);
      setError('Unable to generate lawyer consultation brief. Please try again with valid document text.');
    } finally {
      setLoading(false);
    }
  }

  async function handleExportPDF() {
    if (!briefRef.current || !brief) return;
    setExporting('pdf');
    try {
      await exportToPDF(briefRef.current, `synapse-law-brief-${Date.now()}.pdf`);
    } catch (err) {
      console.error('[Synapse Law] PDF export error:', err);
      setError('PDF export failed. Please verify browser print permissions and try again.');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportPPT() {
    if (!brief) return;
    setExporting('ppt');
    try {
      await exportToPPT(brief, riskData, `synapse-law-brief-${Date.now()}.pptx`);
    } catch (err) {
      console.error('[Synapse Law] PPT export error:', err);
      setError('PowerPoint export failed. Please verify file download permissions and try again.');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Generate Panel */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '8px' }}>📋 Lawyer Preparation Brief</h3>
        <p style={{ marginBottom: '20px' }}>
          Generate a comprehensive brief to prepare for your attorney consultation — including top risks, missing provisions, and questions to ask.
        </p>
        <button
          id="brief-generate-btn"
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
          onClick={handleGenerate}
          disabled={loading || !documentText}
        >
          {loading ? <><span className="spinner" /> Generating Brief...</> : '⚡ Generate Lawyer Brief'}
        </button>
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" id="brief-disclaimer">
        <span className="disclaimer-icon">⚠️</span>
        Not Professional Legal Advice — For Informational Purposes Only. This brief is for consultation preparation only.
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '16px', borderColor: 'var(--risk-crimson)' }}>
          <p style={{ color: 'var(--risk-crimson)' }}>❌ {error}</p>
        </div>
      )}

      {/* Brief Preview */}
      {brief && !loading && (
        <>
          {/* Export Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              id="brief-export-pdf"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleExportPDF}
              disabled={!!exporting}
            >
              {exporting === 'pdf' ? <><span className="spinner" /> Generating PDF...</> : '📄 Export as PDF'}
            </button>
            <button
              id="brief-export-ppt"
              className="btn btn-secondary"
              style={{ flex: 1 }}
              onClick={handleExportPPT}
              disabled={!!exporting}
            >
              {exporting === 'ppt' ? <><span className="spinner" /> Generating PPT...</> : '📊 Export as PowerPoint'}
            </button>
          </div>

          {/* Brief Content */}
          <div className="animate-fadeInUp">
            <div ref={briefRef} id="brief-export-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Cover */}
            <div className="glass-card" style={{ padding: '28px', background: 'linear-gradient(135deg, hsla(217,91%,60%,0.08), hsla(258,80%,65%,0.08))', borderColor: 'hsla(217,91%,60%,0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    ⚖️ Synapse Law — Lawyer Preparation Brief
                  </div>
                  <h2 style={{ marginBottom: '4px' }}>{brief.documentTitle}</h2>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{brief.documentType}</p>
                </div>
                {riskData && (
                  <div style={{ textAlign: 'center' }}>
                    <RiskBadge level={riskData.riskLevel} score={riskData.overallScore} pulse={riskData.riskLevel === 'high'} size="lg" />
                  </div>
                )}
              </div>
              <div className="divider" style={{ margin: '20px 0' }} />
              <p style={{ lineHeight: 1.8, fontSize: '0.9375rem' }}>{brief.executiveSummary}</p>
              {brief.financialExposure && (
                <div style={{ marginTop: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--risk-amber)', fontWeight: 600 }}>💰 Financial Exposure:</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{brief.financialExposure}</span>
                </div>
              )}
              <p style={{ marginTop: '14px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Generated: {new Date(brief.generatedAt).toLocaleString()}
              </p>
            </div>

            {/* Key Parties */}
            {brief.keyParties?.length > 0 && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ marginBottom: '14px' }}>👥 Key Parties & Obligations</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {brief.keyParties.map((party, i) => (
                    <div key={i} style={{ padding: '14px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '6px' }}>
                        {party.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— {party.role}</span>
                      </div>
                      {party.obligations?.map((o, j) => (
                        <div key={j} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>• {o}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Risks */}
            {brief.topRisks?.length > 0 && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ marginBottom: '14px', color: 'var(--risk-crimson)' }}>🔴 Top {brief.topRisks.length} Risk Clauses</h4>
                {brief.topRisks.map((risk, i) => (
                  <div key={i} style={{ marginBottom: '16px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--risk-crimson)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '8px' }}>#{risk.rank}</span>
                        <strong>{risk.clauseTitle}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginLeft: '8px' }}>{risk.sectionRef}</span>
                      </div>
                      <RiskBadge level={risk.severity} />
                    </div>
                    <blockquote className="quote-block">{risk.directQuote}</blockquote>
                    <p style={{ fontSize: '0.875rem', marginTop: '10px' }}>{risk.riskExplanation}</p>
                    {risk.negotiationLeverage && (
                      <div style={{ marginTop: '10px', padding: '10px', background: 'hsla(217,91%,60%,0.08)', borderRadius: 'var(--radius-sm)' }}>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--brand-primary)' }}>💡 {risk.negotiationLeverage}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Red Lines */}
            {brief.redLines?.length > 0 && (
              <div className="glass-card" style={{ padding: '20px', borderColor: 'var(--risk-crimson)' }}>
                <h4 style={{ marginBottom: '14px', color: 'var(--risk-crimson)' }}>🚫 Red Lines — Never Agree Without Modification</h4>
                {brief.redLines.map((line, i) => (
                  <div key={i} style={{ padding: '10px', marginBottom: '8px', background: 'var(--risk-crimson-bg)', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', color: 'var(--risk-crimson)' }}>
                    ✗ {line}
                  </div>
                ))}
              </div>
            )}

            {/* Missing Provisions */}
            {brief.missingProvisions?.length > 0 && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ marginBottom: '14px', color: 'var(--risk-amber)' }}>⚠️ Missing Provisions</h4>
                {brief.missingProvisions.map((p, i) => (
                  <div key={i} style={{ marginBottom: '12px', padding: '12px', background: 'var(--risk-amber-bg)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--risk-amber)', marginBottom: '4px' }}>{p.provision || p}</div>
                    {p.importance && <p style={{ fontSize: '0.8125rem' }}>{p.importance}</p>}
                    {p.recommendation && <p style={{ fontSize: '0.8125rem', color: 'var(--brand-primary)', marginTop: '4px' }}>→ {p.recommendation}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Questions for Attorney */}
            {brief.questionsForAttorney?.length > 0 && (
              <div className="glass-card" style={{ padding: '20px' }}>
                <h4 style={{ marginBottom: '14px' }}>💼 Questions to Ask Your Attorney</h4>
                <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {brief.questionsForAttorney.map((q, i) => (
                    <li key={i} style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{q}</li>
                  ))}
                </ol>
              </div>
            )}

            {/* Final Disclaimer */}
            <div className="disclaimer-banner" style={{ background: 'var(--risk-amber-bg)', borderColor: 'var(--risk-amber)' }}>
              <span className="disclaimer-icon">⚠️</span>
              <span style={{ color: 'var(--risk-amber)' }}>
                <strong>IMPORTANT:</strong> {brief.disclaimer}
              </span>
            </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default BriefGenerator;
