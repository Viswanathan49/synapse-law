import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService.js';
import './SavedMemoryModal.css';

function SavedMemoryModal({ isOpen, onClose, user, onLoadMemoryToWorkspace }) {
  const [memories, setMemories] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    if (isOpen && user) {
      loadUserMemories();
    }
  }, [isOpen, user]);

  function loadUserMemories() {
    if (!user) return;
    const items = authService.getSavedMemories(user.id);
    setMemories(items);
  }

  function handleDelete(memId, e) {
    e.stopPropagation();
    if (!user) return;
    authService.deleteMemory(user.id, memId);
    loadUserMemories();
  }

  function handleLoad(mem) {
    onLoadMemoryToWorkspace({
      filename: mem.filename,
      sourceType: mem.docType || 'pdf',
      pageCount: mem.pageCount || 1,
      text: mem.sampleText || `CONTRACT DOCUMENT: ${mem.filename}\n\n${mem.eli5Summary}`,
      savedMemory: mem
    });
    onClose();
  }

  if (!isOpen || !user) return null;

  const filteredMemories = memories.filter(m => {
    if (activeFilter === 'high') return m.overallRiskScore >= 70;
    if (activeFilter === 'medium') return m.overallRiskScore >= 40 && m.overallRiskScore < 70;
    if (activeFilter === 'low') return m.overallRiskScore < 40;
    return true;
  });

  return (
    <div className="memory-modal-backdrop animate-fadeIn">
      <div className="memory-modal-card glass-card animate-fadeInUp">
        {/* Header */}
        <div className="memory-modal-header">
          <div className="memory-user-pill">
            <span className="memory-user-avatar">{user.avatar || '👤'}</span>
            <div>
              <div className="memory-modal-title">
                {user.name}'s Saved Memory Vault
              </div>
              <div className="memory-modal-sub">
                {memories.length} contract document{memories.length !== 1 ? 's' : ''} stored locally
              </div>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Filter Bar */}
        <div className="memory-filter-bar">
          <button
            className={`memory-filter-chip ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Vault Items ({memories.length})
          </button>
          <button
            className={`memory-filter-chip ${activeFilter === 'high' ? 'active' : ''}`}
            onClick={() => setActiveFilter('high')}
          >
            🔴 High Risk ({memories.filter(m => m.overallRiskScore >= 70).length})
          </button>
          <button
            className={`memory-filter-chip ${activeFilter === 'medium' ? 'active' : ''}`}
            onClick={() => setActiveFilter('medium')}
          >
            🟡 Medium Risk ({memories.filter(m => m.overallRiskScore >= 40 && m.overallRiskScore < 70).length})
          </button>
        </div>

        {/* Content list */}
        <div className="memory-list">
          {filteredMemories.length === 0 ? (
            <div className="memory-empty">
              <span style={{ fontSize: '2.5rem' }}>🧠</span>
              <div style={{ fontWeight: 600, marginTop: '8px', color: 'var(--text-primary)' }}>
                No Saved Memories Found
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                Upload any contract in the Legal Dashboard and click "Save to User Memory" to populate your encrypted vault.
              </p>
            </div>
          ) : (
            filteredMemories.map(mem => (
              <div key={mem.id} className="memory-item glass-card" onClick={() => handleLoad(mem)}>
                <div className="memory-item-header">
                  <div className="memory-item-icon">
                    {mem.docType === 'pdf' ? '📄' : mem.docType === 'docx' ? '📝' : '📋'}
                  </div>
                  <div className="memory-item-title-wrap">
                    <div className="memory-item-title">{mem.filename}</div>
                    <div className="memory-item-date">
                      Saved {new Date(mem.savedAt).toLocaleDateString()} · {mem.pageCount || 1} pages
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge badge-${mem.overallRiskScore >= 70 ? 'crimson' : mem.overallRiskScore >= 40 ? 'amber' : 'emerald'}`}>
                      {mem.overallRiskScore}/100 {mem.riskLevel || 'SCANNED'}
                    </span>
                    <button
                      className="memory-delete-btn"
                      onClick={(e) => handleDelete(mem.id, e)}
                      title="Delete Memory"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {mem.eli5Summary && (
                  <p className="memory-item-summary">
                    {mem.eli5Summary}
                  </p>
                )}

                {mem.riskHighlights && mem.riskHighlights.length > 0 && (
                  <div className="memory-tags">
                    {mem.riskHighlights.map((tag, i) => (
                      <span key={i} className="memory-tag">
                        ⚠️ {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="memory-item-footer">
                  <span className="memory-load-cta">⚡ Click to Load into Workspace →</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="memory-modal-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
}

export default SavedMemoryModal;
