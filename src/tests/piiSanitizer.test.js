import { describe, it, expect } from 'vitest';
import { sanitizePII, containsPII } from '../utils/piiSanitizer.js';

describe('PII Sanitizer', () => {
  // ── SSN ──
  describe('SSN detection and redaction', () => {
    it('redacts standard SSN format', () => {
      const { sanitized, redactedCount } = sanitizePII('My SSN is 123-45-6789.');
      expect(sanitized).toContain('[SSN_REDACTED]');
      expect(sanitized).not.toContain('123-45-6789');
      expect(redactedCount).toBe(1);
    });

    it('redacts multiple SSNs in one text', () => {
      const { sanitized, redactedCount } = sanitizePII('SSN A: 123-45-6789 and SSN B: 987-65-4321');
      expect(redactedCount).toBe(2);
      expect(sanitized).not.toContain('123-45-6789');
      expect(sanitized).not.toContain('987-65-4321');
    });
  });

  // ── Email ──
  describe('Email detection and redaction', () => {
    it('redacts standard email addresses', () => {
      const { sanitized, redactedCount } = sanitizePII('Contact john.doe@company.com for details.');
      expect(sanitized).toContain('[EMAIL_REDACTED]');
      expect(sanitized).not.toContain('john.doe@company.com');
      expect(redactedCount).toBe(1);
    });

    it('redacts emails with subdomains', () => {
      const { sanitized } = sanitizePII('Email: user@mail.example.co.uk');
      expect(sanitized).toContain('[EMAIL_REDACTED]');
    });
  });

  // ── Phone ──
  describe('Phone number detection and redaction', () => {
    it('redacts US phone numbers with dashes', () => {
      const { sanitized, redactedCount } = sanitizePII('Call 555-867-5309 for more info.');
      expect(sanitized).toContain('[PHONE_REDACTED]');
      expect(redactedCount).toBe(1);
    });

    it('redacts phone with parentheses format', () => {
      const { sanitized } = sanitizePII('Phone: (512) 555-1234');
      expect(sanitized).toContain('[PHONE_REDACTED]');
    });

    it('redacts phone with country code', () => {
      const { sanitized } = sanitizePII('Call +1-800-555-1234 now.');
      expect(sanitized).toContain('[PHONE_REDACTED]');
    });
  });

  // ── Credit Card ──
  describe('Credit card detection and redaction', () => {
    it('redacts 16-digit credit card numbers', () => {
      const { sanitized, redactedCount } = sanitizePII('Card: 4111 1111 1111 1111');
      expect(sanitized).toContain('[CC_REDACTED]');
      expect(redactedCount).toBe(1);
    });

    it('redacts credit card with dashes', () => {
      const { sanitized } = sanitizePII('CC: 4111-1111-1111-1111');
      expect(sanitized).toContain('[CC_REDACTED]');
    });
  });

  // ── Mixed PII ──
  describe('Mixed PII document', () => {
    it('redacts all PII types in a legal document', () => {
      const doc = `
        Tenant: John Smith
        Email: jsmith@tenant.com
        Phone: (555) 234-5678
        SSN: 234-56-7890
        Address: 123 Main Street, Austin, TX
        Card: 5500 0000 0000 0004
      `;
      const { sanitized, redactedCount, types } = sanitizePII(doc);
      expect(sanitized).not.toContain('jsmith@tenant.com');
      expect(sanitized).not.toContain('234-56-7890');
      expect(redactedCount).toBeGreaterThan(2);
      expect(types).toContain('EMAIL');
      expect(types).toContain('SSN');
    });
  });

  // ── Edge Cases ──
  describe('Edge cases', () => {
    it('returns unchanged text when no PII present', () => {
      const clean = 'This agreement shall be governed by Texas law.';
      const { sanitized, redactedCount } = sanitizePII(clean);
      expect(sanitized).toBe(clean);
      expect(redactedCount).toBe(0);
    });

    it('handles empty string', () => {
      const { sanitized, redactedCount } = sanitizePII('');
      expect(sanitized).toBe('');
      expect(redactedCount).toBe(0);
    });

    it('handles null input gracefully', () => {
      const { sanitized, redactedCount } = sanitizePII(null);
      expect(sanitized).toBe('');
      expect(redactedCount).toBe(0);
    });

    it('containsPII returns true when PII present', () => {
      expect(containsPII('Email: test@example.com')).toBe(true);
    });

    it('containsPII returns false when no PII', () => {
      expect(containsPII('Standard legal terms apply.')).toBe(false);
    });
  });

  // ── Security Edge Cases ──
  describe('Security hardening edge cases', () => {
    it('handles XSS injection strings without throwing', () => {
      const xss = '<script>alert("xss")</script> SSN: 123-45-6789';
      const { sanitized } = sanitizePII(xss);
      // Script tag itself is not PII but SSN should still be redacted
      expect(sanitized).toContain('[SSN_REDACTED]');
      expect(sanitized).not.toContain('123-45-6789');
    });

    it('handles SQL injection strings without throwing', () => {
      const sql = "'; DROP TABLE users; -- email: injector@evil.com";
      expect(() => sanitizePII(sql)).not.toThrow();
      const { sanitized } = sanitizePII(sql);
      expect(sanitized).toContain('[EMAIL_REDACTED]');
    });

    it('handles very long input (50,000 chars) without hanging', () => {
      const longText = 'Normal legal text. '.repeat(2631) + 'SSN: 999-88-7777';
      const { sanitized, redactedCount } = sanitizePII(longText);
      expect(redactedCount).toBeGreaterThanOrEqual(1);
      expect(sanitized).not.toContain('999-88-7777');
    });

    it('handles undefined input gracefully', () => {
      const { sanitized, redactedCount } = sanitizePII(undefined);
      expect(sanitized).toBe('');
      expect(redactedCount).toBe(0);
    });

    it('handles numeric input without throwing', () => {
      expect(() => sanitizePII(12345)).not.toThrow();
    });

    it('redacts SSN embedded in JSON-like string', () => {
      const json = '{"ssn":"123-45-6789","name":"John"}';
      const { sanitized } = sanitizePII(json);
      expect(sanitized).not.toContain('123-45-6789');
    });

    it('redacts email inside URL-like string', () => {
      const url = 'mailto:attacker@evil.com?subject=Hello';
      const { sanitized } = sanitizePII(url);
      expect(sanitized).not.toContain('attacker@evil.com');
    });

    it('containsPII handles null gracefully', () => {
      expect(containsPII(null)).toBe(false);
    });

    it('containsPII handles empty string', () => {
      expect(containsPII('')).toBe(false);
    });

    it('does not modify non-PII Unicode text', () => {
      const unicode = '法律文件 — Правовой документ — القانونية';
      const { sanitized, redactedCount } = sanitizePII(unicode);
      expect(redactedCount).toBe(0);
      expect(sanitized).toBe(unicode);
    });
  });
});

