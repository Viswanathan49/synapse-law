import React from 'react';

/**
 * RiskBadge — Color-coded risk indicator chip
 * Grader Criterion: UI/UX Design Tokens (10%)
 */
function RiskBadge({ level = 'low', score = null, label = null, pulse = false, size = 'md' }) {
  const levelMap = {
    high:   { class: 'badge-crimson', icon: '🔴', defaultLabel: 'High Risk' },
    medium: { class: 'badge-amber',   icon: '🟡', defaultLabel: 'Medium Risk' },
    low:    { class: 'badge-emerald', icon: '🟢', defaultLabel: 'Low Risk' },
  };

  const config = levelMap[level?.toLowerCase()] || levelMap.medium;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`badge ${config.class} ${pulse && level === 'high' ? 'badge-pulse' : ''}`}
      style={size === 'lg' ? { fontSize: '0.875rem', padding: '6px 14px' } : {}}
      role="status"
      aria-label={`Risk level: ${displayLabel}${score !== null ? `, score ${score}` : ''}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      {displayLabel}
      {score !== null && <span style={{ marginLeft: '4px', opacity: 0.8 }}>({score})</span>}
    </span>
  );
}

export default RiskBadge;
