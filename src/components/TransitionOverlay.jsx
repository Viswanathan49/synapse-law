import React, { useEffect, useState } from 'react';
import './TransitionOverlay.css';

const STEPS = [
  { icon: '🔐', text: 'Authenticating Encrypted Vault Credentials...' },
  { icon: '🛡️', text: 'Verifying Client-Side PII Safeguards...' },
  { icon: '🧠', text: 'Synching User Saved Document Memories...' },
  { icon: '⚡', text: 'Initializing Gemini 1.5 Pro Legal Engine...' },
];

function TransitionOverlay({ isVisible, user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isVisible) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 200);
          return 100;
        }
        const next = prev + 12;
        if (next > 75) setCurrentStep(3);
        else if (next > 50) setCurrentStep(2);
        else if (next > 25) setCurrentStep(1);
        return next;
      });
    }, 70);

    return () => clearInterval(interval);
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="transition-overlay animate-fadeIn">
      <div className="transition-content glass-card animate-fadeInUp">
        <div className="transition-logo-wrap">
          <span className="transition-logo-icon">⚖️</span>
          <div className="transition-glow-ring" />
        </div>

        <h3 className="transition-heading">Entering LexiGuard Vault</h3>
        {user && (
          <div className="transition-user-badge">
            <span>{user.avatar || '👤'}</span>
            <span>Authenticated as <strong>{user.name}</strong></span>
          </div>
        )}

        <div className="transition-step-box">
          <span className="transition-step-icon">{STEPS[currentStep].icon}</span>
          <span className="transition-step-text">{STEPS[currentStep].text}</span>
        </div>

        <div className="transition-progress-bg">
          <div className="transition-progress-bar" style={{ width: `${progress}%` }} />
        </div>

        <div className="transition-footer">
          <span>🔒 256-Bit SHA Encrypted Local Workspace</span>
          <span>{progress}%</span>
        </div>
      </div>
    </div>
  );
}

export default TransitionOverlay;
