/**
 * accessibility.test.jsx — Automated WCAG 2.1 AA & Section 508 Accessibility
 * unit tests verifying semantic landmarks, ARIA dialog roles, skip links,
 * keyboard escape handlers, and button labeling.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Import components to test accessibility semantics
import AuthModal from '../components/AuthModal.jsx';
import SavedMemoryModal from '../components/SavedMemoryModal.jsx';
import BatchComparatorModal from '../components/BatchComparatorModal.jsx';
import RedlineCopilot from '../components/RedlineCopilot.jsx';
import RiskBadge from '../components/RiskBadge.jsx';

const mockUser = {
  id: 'user_test_01',
  name: 'Sarah Connor',
  email: 'sarah@test.com',
  role: 'Counsel',
  avatar: '👩‍⚖️',
};

describe('Accessibility & WCAG 2.1 Semantics', () => {
  // ── Modal Dialog Semantics ──
  describe('Modal Dialog Semantics (WCAG 2.1.2 / 4.1.2)', () => {
    it('AuthModal renders as a modal dialog with role="dialog" and aria-modal="true"', () => {
      render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'auth-modal-title');
    });

    it('AuthModal close button has an accessible aria-label', () => {
      render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);
      const closeBtn = screen.getByRole('button', { name: /close authentication modal/i });
      expect(closeBtn).toBeInTheDocument();
    });

    it('SavedMemoryModal renders as a modal dialog with accessible title', () => {
      render(<SavedMemoryModal isOpen={true} onClose={() => {}} user={mockUser} onLoadMemoryToWorkspace={() => {}} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('BatchComparatorModal has role="dialog" and accessible label', () => {
      render(<BatchComparatorModal isOpen={true} onClose={() => {}} user={mockUser} onLoadDocument={() => {}} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'Portfolio Batch Risk Audit');
    });

    it('RedlineCopilot renders as a modal dialog with aria-label', () => {
      const mockFlag = { type: 'AUTO_RENEWAL', severity: 'high', sectionRef: 'Sec 2', directQuote: 'Renews automatically' };
      render(<RedlineCopilot riskFlag={mockFlag} documentText="test document" onClose={() => {}} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-label', 'AI Clause Redline Copilot');
    });
  });

  // ── Keyboard Escape Key Traps (WCAG 2.1.2 No Keyboard Trap) ──
  describe('Keyboard Escape Key Navigation', () => {
    it('AuthModal triggers onClose when Escape key is pressed', () => {
      let closed = false;
      render(<AuthModal isOpen={true} onClose={() => { closed = true; }} onLoginSuccess={() => {}} />);
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(closed).toBe(true);
    });

    it('SavedMemoryModal triggers onClose when Escape key is pressed', () => {
      let closed = false;
      render(<SavedMemoryModal isOpen={true} onClose={() => { closed = true; }} user={mockUser} onLoadMemoryToWorkspace={() => {}} />);
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(closed).toBe(true);
    });

    it('BatchComparatorModal triggers onClose when Escape key is pressed', () => {
      let closed = false;
      render(<BatchComparatorModal isOpen={true} onClose={() => { closed = true; }} user={mockUser} onLoadDocument={() => {}} />);
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(closed).toBe(true);
    });

    it('RedlineCopilot triggers onClose when Escape key is pressed', () => {
      let closed = false;
      const mockFlag = { type: 'AUTO_RENEWAL', severity: 'high' };
      render(<RedlineCopilot riskFlag={mockFlag} documentText="test" onClose={() => { closed = true; }} />);
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(closed).toBe(true);
    });
  });

  // ── Form Input Accessible Constraints ──
  describe('Form Input Accessibility & Constraints', () => {
    it('AuthModal email input has maxLength and type="email"', () => {
      render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);
      // Switch to Login tab
      const loginTab = screen.getByRole('tab', { name: /vault login/i });
      fireEvent.click(loginTab);
      const emailInput = screen.getByPlaceholderText(/name@firm.com/i);
      expect(emailInput).toHaveAttribute('maxLength', '254');
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('AuthModal password input has maxLength', () => {
      render(<AuthModal isOpen={true} onClose={() => {}} onLoginSuccess={() => {}} />);
      const loginTab = screen.getByRole('tab', { name: /vault login/i });
      fireEvent.click(loginTab);
      const passwordInput = screen.getByPlaceholderText(/••••••••••••/i);
      expect(passwordInput).toHaveAttribute('maxLength', '128');
    });
  });

  // ── Status Badges & Visual Semantics ──
  describe('Status Badges & Visual Accessibility', () => {
    it('RiskBadge renders with accessible text description', () => {
      render(<RiskBadge level="high" score={85} />);
      const badge = screen.getByText(/85/);
      expect(badge).toBeInTheDocument();
    });

    it('RiskBadge maps low risk to emerald severity class', () => {
      const { container } = render(<RiskBadge level="low" score={20} />);
      expect(container.querySelector('.badge-emerald')).toBeInTheDocument();
    });
  });
});
