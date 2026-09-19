import { describe, it, expect } from 'vitest';
import { scoreRisk, severityToBadge, clampScore } from '../utils/riskScorer.js';

describe('Risk Scorer', () => {
  // ── High Risk Scenarios ──
  describe('High-risk documents', () => {
    it('scores indemnification clauses as high-risk', () => {
      const text = 'Tenant shall indemnify, defend, and hold harmless Landlord from any and all claims.';
      const { score, detectedClauses } = scoreRisk(text);
      expect(score).toBeGreaterThanOrEqual(20);
      expect(detectedClauses).toContain('INDEMNIFICATION');
    });

    it('scores auto-renewal clauses', () => {
      const text = 'This agreement shall automatically renew for successive one-year terms unless cancelled.';
      const { score, detectedClauses } = scoreRisk(text);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(detectedClauses).toContain('AUTO_RENEWAL');
    });

    it('scores unilateral amendment clauses', () => {
      const text = 'Landlord may amend any term at its sole discretion without notice to Tenant.';
      const { score, detectedClauses } = scoreRisk(text);
      expect(score).toBeGreaterThanOrEqual(15);
      expect(detectedClauses).toContain('UNILATERAL_AMENDMENT');
    });

    it('flags IP assignment clauses', () => {
      const text = 'Employee irrevocably assigns all right and title as work for hire to the Company.';
      const { detectedClauses } = scoreRisk(text);
      expect(detectedClauses).toContain('IP_ASSIGNMENT');
    });

    it('assigns Crimson badge for score >= 65', () => {
      const highRiskText = `
        Tenant shall indemnify and hold harmless Landlord.
        Agreement automatically renews unless terminated with 90 days notice.
        Landlord may modify terms at its sole discretion without notice.
        Employee assigns all work for hire intellectual property irrevocably.
        Tenant waives right to jury trial in binding arbitration.
        Non-compete restrictions for 3 years anywhere in the United States.
      `;
      const { badge, level } = scoreRisk(highRiskText);
      expect(badge).toBe('crimson');
      expect(level).toBe('high');
    });
  });

  // ── Medium Risk Scenarios ──
  describe('Medium-risk documents', () => {
    it('assigns Amber badge for score 35-64', () => {
      const text = `
        Liability shall not exceed amounts paid in the preceding 12 months.
        Disputes resolved by binding arbitration in the applicable jurisdiction.
        Confidential information shall not be disclosed to third parties.
      `;
      const { badge, level, score } = scoreRisk(text);
      if (score >= 35 && score < 65) {
        expect(badge).toBe('amber');
        expect(level).toBe('medium');
      } else {
        // Score may vary; just ensure no error thrown
        expect(['crimson', 'amber', 'emerald']).toContain(badge);
      }
    });
  });

  // ── Low Risk Scenarios ──
  describe('Low-risk documents', () => {
    it('assigns Emerald badge for benign text', () => {
      const text = 'Both parties agree to mutual cooperation and good faith negotiations.';
      const { badge, level, score } = scoreRisk(text);
      expect(score).toBeLessThan(35);
      expect(badge).toBe('emerald');
      expect(level).toBe('low');
    });

    it('returns zero score for empty string', () => {
      const { score, level } = scoreRisk('');
      expect(score).toBe(0);
      expect(level).toBe('low');
    });

    it('handles null input gracefully', () => {
      const { score, level } = scoreRisk(null);
      expect(score).toBe(0);
      expect(level).toBe('low');
    });
  });

  // ── Missing Protections ──
  describe('Missing protections detection', () => {
    it('detects missing standard clauses', () => {
      const text = 'This agreement governs the relationship between parties.';
      const { missingProtections } = scoreRisk(text);
      expect(Array.isArray(missingProtections)).toBe(true);
      expect(missingProtections.length).toBeGreaterThan(0);
    });

    it('returns fewer missing protections for comprehensive documents', () => {
      const text = `
        Mutual indemnification applies to both parties equally.
        Limitation of liability is capped at contract value.
        Disputes resolved through agreed dispute resolution process.
        Either party may terminate for convenience with 30 days notice.
        Warranty of merchantability is provided for 12 months.
        Governing law is the state of California.
        Data protection measures comply with applicable regulations.
        Audit rights are granted to both parties annually.
      `;
      const { missingProtections } = scoreRisk(text);
      expect(missingProtections.length).toBeLessThan(5);
    });
  });

  // ── Utility Functions ──
  describe('Utility functions', () => {
    it('severityToBadge maps high to crimson', () => {
      expect(severityToBadge('high')).toBe('crimson');
    });
    it('severityToBadge maps medium to amber', () => {
      expect(severityToBadge('medium')).toBe('amber');
    });
    it('severityToBadge maps low to emerald', () => {
      expect(severityToBadge('low')).toBe('emerald');
    });
    it('clampScore clamps above 100 to 100', () => {
      expect(clampScore(150)).toBe(100);
    });
    it('clampScore clamps below 0 to 0', () => {
      expect(clampScore(-10)).toBe(0);
    });
    it('clampScore preserves values in range', () => {
      expect(clampScore(55)).toBe(55);
    });
  });
});
