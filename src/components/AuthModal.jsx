import React, { useState } from 'react';
import { authService } from '../services/authService.js';
import './AuthModal.css';

function AuthModal({ isOpen, onClose, onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('demo'); // 'demo' | 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('Corporate Counsel');
  const [company, setCompany] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const demoUsers = authService.getDemoUsers();

  function handleDemoSelect(user) {
    setIsSubmitting(true);
    setTimeout(() => {
      authService.setCurrentUser(user);
      setIsSubmitting(false);
      onLoginSuccess(user);
    }, 400);
  }

  function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const res = authService.login(email, password);
      setIsSubmitting(false);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Authentication failed.');
      }
    }, 500);
  }

  function handleSignupSubmit(e) {
    e.preventDefault();
    setError('');
    if (!name || !email) {
      setError('Please fill in your name and email address.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      const res = authService.signup(name, email, role, company);
      setIsSubmitting(false);
      if (res.success) {
        onLoginSuccess(res.user);
      } else {
        setError(res.error || 'Account creation failed.');
      }
    }, 500);
  }

  return (
    <div className="auth-modal-backdrop animate-fadeIn">
      <div className="auth-modal-card glass-card animate-fadeInUp">
        {/* Modal Header */}
        <div className="auth-modal-header">
          <div className="auth-logo-badge">
            <span className="auth-logo-icon">⚖️</span>
            <div>
              <div className="auth-logo-title">LexiGuard Vault Login</div>
              <div className="auth-logo-sub">Client-Side Encrypted & PII scrubbed</div>
            </div>
          </div>
          <button className="auth-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* Security Alert Banner */}
        <div className="auth-security-banner">
          <span className="auth-security-icon">🔒</span>
          <span>End-to-End Vault Isolation · Memory saved locally per profile</span>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${activeTab === 'demo' ? 'active' : ''}`}
            onClick={() => { setActiveTab('demo'); setError(''); }}
          >
            ⚡ Quick Demo Access
          </button>
          <button
            className={`auth-tab ${activeTab === 'login' ? 'active' : ''}`}
            onClick={() => { setActiveTab('login'); setError(''); }}
          >
            🔑 Vault Login
          </button>
          <button
            className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
            onClick={() => { setActiveTab('signup'); setError(''); }}
          >
            ✨ New Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="auth-error-box">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Tab 1: Demo Quick Select */}
        {activeTab === 'demo' && (
          <div className="auth-tab-content">
            <p className="auth-hint">
              Select a pre-configured legal persona to instantly enter the workspace with pre-populated contract memory:
            </p>
            <div className="auth-demo-grid">
              {demoUsers.map(u => (
                <button
                  key={u.id}
                  className="auth-demo-card glass-card"
                  onClick={() => handleDemoSelect(u)}
                  disabled={isSubmitting}
                >
                  <div className="auth-demo-avatar">{u.avatar}</div>
                  <div className="auth-demo-info">
                    <div className="auth-demo-name">{u.name}</div>
                    <div className="auth-demo-role">{u.role} · {u.company}</div>
                    <div className="auth-demo-badges">
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                        {u.twoFactorEnabled ? '🛡️ 2FA Verified' : 'Vault Ready'}
                      </span>
                      <span className="auth-demo-mem-count">
                        🧠 Saved Memory Ready
                      </span>
                    </div>
                  </div>
                  <span className="auth-demo-arrow">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Vault Email Address</label>
              <input
                type="email"
                className="input"
                placeholder="name@firm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="auth-label">Vault Passphrase</label>
                <button
                  type="button"
                  className="auth-toggle-pwd"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️ Hide' : '👁️ Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                />
                Remember local session
              </label>
              <span style={{ color: 'var(--brand-primary)', cursor: 'pointer' }}>Reset Passphrase?</span>
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" /> Authenticating Vault...
                </>
              ) : (
                '🔐 Open Secure Vault & Launch Workspace'
              )}
            </button>
          </form>
        )}

        {/* Tab 3: Sign Up Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignupSubmit} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="Attorney / Counsel Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Work Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field-row">
              <div className="auth-field">
                <label className="auth-label">Primary Role</label>
                <select
                  className="select"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                >
                  <option value="Corporate Counsel">Corporate Counsel</option>
                  <option value="Managing Director">Managing Director</option>
                  <option value="Legal Assistant">Legal Assistant</option>
                  <option value="Contract Negotiator">Contract Negotiator</option>
                  <option value="Individual Pro">Individual Pro</option>
                </select>
              </div>
              <div className="auth-field">
                <label className="auth-label">Organization / Firm</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Legal Corp"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="spinner" /> Provisioning Vault...
                </>
              ) : (
                '✨ Create Encrypted Profile & Launch'
              )}
            </button>
          </form>
        )}

        {/* Modal Footer */}
        <div className="auth-modal-footer">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-disabled)' }}>
            🛡️ 256-Bit SHA Local Hash · Client-Side Memory Isolation · Zero Server Hallucination
          </span>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
