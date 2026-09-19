import React from 'react';
import './RiskMatrixChart.css';

function RiskMatrixChart({ riskData, documentText }) {
  // Compute 4-dimension scores based on riskData or document text analysis
  const dimensions = React.useMemo(() => {
    if (riskData && riskData.dimensions) {
      return riskData.dimensions;
    }

    const lower = (documentText || '').toLowerCase();
    const flags = riskData?.flags || [];

    let financial = 35;
    let legal = 40;
    let operational = 30;
    let ipData = 25;

    // Financial calculations
    if (lower.includes('rent') || lower.includes('fee') || lower.includes('penalty') || lower.includes('increase')) financial += 25;
    if (flags.some(f => f.type?.includes('RENEWAL') || f.type?.includes('PRICE'))) financial += 20;

    // Legal liability
    if (lower.includes('indemnif') || lower.includes('hold harmless') || lower.includes('liability')) legal += 35;
    if (flags.some(f => f.type?.includes('INDEMNIFICATION'))) legal += 20;

    // Operational & renewal
    if (lower.includes('automatic') || lower.includes('renew') || lower.includes('termination')) operational += 35;
    if (flags.some(f => f.type?.includes('AUTO_RENEWAL') || f.type?.includes('AMENDMENT'))) operational += 20;

    // IP & Data
    if (lower.includes('inventions') || lower.includes('assign') || lower.includes('data') || lower.includes('intellectual')) ipData += 40;
    if (flags.some(f => f.type?.includes('IP_ASSIGNMENT'))) ipData += 25;

    return [
      { key: 'financial',   label: 'Financial Exposure',     score: Math.min(financial, 95),   icon: '💰', color: 'hsl(38, 95%, 55%)' },
      { key: 'legal',       label: 'Legal Liability',        score: Math.min(legal, 98),       icon: '⚖️', color: 'hsl(0, 85%, 58%)' },
      { key: 'operational', label: 'Operational & Renewal',  score: Math.min(operational, 90), icon: '🔄', color: 'hsl(217, 91%, 60%)' },
      { key: 'ipData',      label: 'IP & Data Ownership',    score: Math.min(ipData, 88),      icon: '🛡️', color: 'hsl(258, 80%, 65%)' }
    ];
  }, [riskData, documentText]);

  // Generate SVG Radar Polygon points
  const radius = 70;
  const center = 90;

  const points = dimensions.map((d, index) => {
    const angle = (Math.PI / 2) * index - Math.PI / 2;
    const factor = d.score / 100;
    const r = radius * factor;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div className="risk-matrix-card glass-card">
      <div className="risk-matrix-header">
        <div>
          <h4 className="risk-matrix-title">📊 4-Dimension Risk Matrix</h4>
          <p className="risk-matrix-sub">Multi-axial legal, financial, operational & IP risk score analysis</p>
        </div>
        <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
          4-AXIS RADAR
        </span>
      </div>

      <div className="risk-matrix-body">
        {/* SVG Radar Chart */}
        <div className="risk-radar-svg-wrap">
          <svg width="180" height="180" viewBox="0 0 180 180" className="risk-radar-svg">
            {/* Concentric Grid Rings */}
            <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-subtle)" strokeDasharray="3,3" />
            <circle cx={center} cy={center} r={radius * 0.66} fill="none" stroke="var(--border-subtle)" strokeDasharray="3,3" />
            <circle cx={center} cy={center} r={radius * 0.33} fill="none" stroke="var(--border-subtle)" strokeDasharray="3,3" />

            {/* Radar Grid Axes */}
            <line x1={center} y1={center - radius} x2={center} y2={center + radius} stroke="var(--border-subtle)" />
            <line x1={center - radius} y1={center} x2={center + radius} y2={center} stroke="var(--border-subtle)" />

            {/* Polygon Plot */}
            <polygon
              points={points}
              fill="hsla(217, 91%, 60%, 0.25)"
              stroke="var(--brand-primary)"
              strokeWidth="2"
              className="risk-radar-polygon"
            />

            {/* Vertex Dots */}
            {dimensions.map((d, index) => {
              const angle = (Math.PI / 2) * index - Math.PI / 2;
              const r = radius * (d.score / 100);
              const x = center + r * Math.cos(angle);
              const y = center + r * Math.sin(angle);
              return (
                <circle
                  key={d.key}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={d.color}
                  stroke="var(--bg-secondary)"
                  strokeWidth="1.5"
                />
              );
            })}
          </svg>
        </div>

        {/* 4 Dimension Progress Bars */}
        <div className="risk-matrix-bars">
          {dimensions.map(dim => (
            <div key={dim.key} className="risk-bar-item">
              <div className="risk-bar-header">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{dim.icon}</span>
                  <span className="risk-bar-label">{dim.label}</span>
                </span>
                <span className="risk-bar-score" style={{ color: dim.color }}>
                  {dim.score}/100
                </span>
              </div>
              <div className="risk-bar-track">
                <div
                  className="risk-bar-fill"
                  style={{
                    width: `${dim.score}%`,
                    background: dim.color,
                    boxShadow: `0 0 8px ${dim.color}`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RiskMatrixChart;
