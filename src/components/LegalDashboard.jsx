import React, { useState, useEffect } from 'react';
import DocumentUploader from './DocumentUploader.jsx';
import SimplifierView from './SimplifierView.jsx';
import RiskRadar from './RiskRadar.jsx';
import ContractComparator from './ContractComparator.jsx';
import QAEngine from './QAEngine.jsx';
import BriefGenerator from './BriefGenerator.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';
import SavedMemoryModal from './SavedMemoryModal.jsx';
import { authService } from '../services/authService.js';

const TABS = [
  { id: 'simplifier', label: 'Simplifier',  icon: '📄', shortLabel: 'Simplify' },
  { id: 'risk',       label: 'Risk Scanner', icon: '🚨', shortLabel: 'Risk' },
  { id: 'compare',    label: 'Comparator',   icon: '⚖️', shortLabel: 'Compare' },
  { id: 'qa',         label: 'Q&A Engine',   icon: '💬', shortLabel: 'Q&A' },
  { id: 'brief',      label: 'Brief',        icon: '📋', shortLabel: 'Brief' },
];

function LegalDashboard({ onBackToLanding, currentUser, onOpenAuthModal, onLogout, initialTab = 'simplifier' }) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [document, setDocument] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [memoryCount, setMemoryCount] = useState(0);

  useEffect(() => {
    if (initialTab && TABS.some(t => t.id === initialTab)) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (currentUser) {
      const memories = authService.getSavedMemories(currentUser.id);
      setMemoryCount(memories.length);
    }
  }, [currentUser, isMemoryModalOpen]);

  function handleDocumentLoad(doc) {
    setDocument(doc);
    setRiskData(null);
    if (doc.savedMemory) {
      setSaveSuccessMsg(`Loaded memory: "${doc.filename}"`);
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    }
  }

  function handleSaveToMemory() {
    if (!currentUser || !document) return;
    const memoryItem = {
      filename: document.filename || 'Untitled_Contract.pdf',
      docType: document.sourceType || 'pdf',
      pageCount: document.pageCount || 1,
      overallRiskScore: riskData?.overallRiskScore || 65,
      riskLevel: riskData?.riskLevel || 'MEDIUM RISK',
      riskCount: riskData?.topRisks?.length || 2,
      eli5Summary: riskData?.eli5Summary || 'Analyzed contract document saved to vault.',
      riskHighlights: (riskData?.topRisks || []).map(r => `${r.type} (${r.section || 'General'})`),
      sampleText: document.text
    };

    authService.saveMemory(currentUser.id, memoryItem);
    const updated = authService.getSavedMemories(currentUser.id);
    setMemoryCount(updated.length);
    setSaveSuccessMsg(' Saved contract analysis to your Vault Memory!');
    setTimeout(() => setSaveSuccessMsg(''), 3500);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBackToLanding && (
            <button
              id="nav-back-home"
              className="btn btn-ghost btn-sm"
              onClick={onBackToLanding}
              style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}
            >
              ← Home
            </button>
          )}
          <span style={{ fontSize: '1.5rem' }}>⚖️</span>
          <div>
            <span style={{ fontWeight: 800, fontSize: '1.125rem', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              LexiGuard AI
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '8px' }} className="hide-mobile">Legal Intelligence</span>
          </div>
        </div>

        {/* Center: Save success notification banner */}
        {saveSuccessMsg && (
          <div className="badge badge-emerald animate-fadeIn" style={{ fontSize: '0.75rem', padding: '6px 14px' }}>
            {saveSuccessMsg}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Save active document to user memory button */}
          {document && currentUser && (
            <button
              id="save-vault-memory"
              className="btn btn-secondary btn-sm"
              onClick={handleSaveToMemory}
              title="Save current contract analysis to your user memory vault"
              style={{ borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
            >
              💾 Save to Memory
            </button>
          )}

          {/* User Memory Vault button */}
          {currentUser && (
            <button
              id="open-memory-vault"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsMemoryModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>🧠 Vault</span>
              <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                {memoryCount}
              </span>
            </button>
          )}

          {/* User profile dropdown button */}
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 10px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-default)' }}>
              <span style={{ fontSize: '1.1rem' }}>{currentUser.avatar || '👤'}</span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currentUser.name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{currentUser.role}</span>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={onLogout}
                title="Switch Vault User / Logout"
                style={{ fontSize: '0.75rem', padding: '2px 6px', color: 'var(--text-muted)' }}
              >
                🚪
              </button>
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenAuthModal}
            >
              🔐 Vault Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar Navigation */}
        <nav
          role="navigation"
          aria-label="Main navigation"
          style={{
            width: '72px',
            borderRight: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            gap: '4px',
            flexShrink: 0,
          }}
        >
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: activeTab === tab.id ? 'hsla(217,91%,60%,0.15)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                transition: 'all var(--transition-base)',
                outline: activeTab === tab.id ? '1px solid var(--brand-primary)' : 'none',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.6rem', color: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--text-muted)', fontWeight: activeTab === tab.id ? 700 : 400 }}>
                {tab.shortLabel}
              </span>
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Tab Label */}
          <div style={{ padding: '16px 24px 0', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px' }}>
              <span style={{ fontSize: '1.375rem' }}>{TABS.find(t => t.id === activeTab)?.icon}</span>
              <h2 style={{ fontSize: '1.125rem' }}>{TABS.find(t => t.id === activeTab)?.label}</h2>
            </div>
          </div>

          {/* Scrollable Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr', gap: '0' }}>
            {!document && activeTab !== 'compare' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '640px', margin: '0 auto', width: '100%' }}>
                <DocumentUploader onDocumentLoad={handleDocumentLoad} />
                <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
                  <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👆</div>
                  <p style={{ color: 'var(--text-muted)' }}>Load a document above to activate {TABS.find(t => t.id === activeTab)?.label}</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: document ? '380px 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>
                {document && (
                  <div style={{ position: 'sticky', top: 0 }}>
                    <DocumentUploader onDocumentLoad={handleDocumentLoad} />
                    {document && (
                      <div className="glass-card" style={{ marginTop: '12px', padding: '14px' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Document Loaded</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>{document.filename}</div>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                          <span className="badge" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                            {document.pageCount} page{document.pageCount !== 1 ? 's' : ''}
                          </span>
                          <span className="badge" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                            {document.sourceType}
                          </span>
                          <span className="badge" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                            {document.text.length.toLocaleString()} chars
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <ErrorBoundary>
                    {activeTab === 'simplifier' && <SimplifierView documentText={document?.text} />}
                    {activeTab === 'risk' && <RiskRadar documentText={document?.text} onRiskData={setRiskData} />}
                    {activeTab === 'compare' && <ContractComparator documentText={document?.text} />}
                    {activeTab === 'qa' && <QAEngine documentText={document?.text} />}
                    {activeTab === 'brief' && <BriefGenerator documentText={document?.text} riskData={riskData} />}
                  </ErrorBoundary>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <SavedMemoryModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
        user={currentUser}
        onLoadMemoryToWorkspace={handleDocumentLoad}
      />
    </div>
  );
}

export default LegalDashboard;
