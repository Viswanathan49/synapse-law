import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateQAResponse, validateRiskResponse, isTrickQuestion } from '../utils/hallucinationGuard.js';

describe('Hallucination Guard', () => {
  describe('validateQAResponse', () => {
    it('verifies a response with complete citations', () => {
      const response = {
        answer: 'The notice period is 30 days.',
        confidence: 'verified',
        sectionRef: 'Section 8.2',
        directQuote: 'notice period of thirty (30) days',
      };
      const sourceText = 'Clause 8.2 states a notice period of thirty (30) days before termination.';
      const { verified, confidence } = validateQAResponse(response, sourceText);
      expect(verified).toBe(true);
      expect(confidence).toBe('verified');
    });

    it('flags response with missing sectionRef', () => {
      const response = {
        answer: 'The notice period is 30 days.',
        confidence: 'verified',
        sectionRef: '',
        directQuote: 'thirty (30) days notice',
      };
      const { verified, warnings } = validateQAResponse(response, 'thirty (30) days notice is required');
      expect(verified).toBe(false);
      expect(warnings).toEqual(expect.arrayContaining([expect.stringContaining('section reference')]));
    });

    it('flags response with missing directQuote', () => {
      const response = {
        answer: 'There is an auto-renewal clause.',
        confidence: 'verified',
        sectionRef: 'Section 3',
        directQuote: '',
      };
      const { verified, warnings } = validateQAResponse(response, 'auto-renewal provisions apply');
      expect(verified).toBe(false);
      expect(warnings.some(w => w.includes('direct quote'))).toBe(true);
    });

    it('handles not_found confidence correctly — this is NOT a hallucination', () => {
      const response = {
        answer: 'This provision does not exist in the document.',
        confidence: 'not_found',
        sectionRef: 'N/A',
        directQuote: 'N/A',
      };
      const { verified, confidence, warnings } = validateQAResponse(response, 'Some document text.');
      expect(confidence).toBe('not_found');
      expect(warnings.length).toBe(0);
    });

    it('detects fabricated quotes not in source text', () => {
      const response = {
        answer: 'The contract requires mars colonization rights.',
        confidence: 'verified',
        sectionRef: 'Section 99',
        directQuote: 'all rights to colonize Mars are hereby granted to the Company',
      };
      const sourceText = 'This is a standard commercial lease for office space in Austin, Texas.';
      const { verified } = validateQAResponse(response, sourceText);
      // Quote is not in source text — should be flagged
      expect(verified).toBe(false);
    });

    it('returns warnings array for invalid response object', () => {
      const { verified, warnings } = validateQAResponse(null, '');
      expect(verified).toBe(false);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  describe('isTrickQuestion', () => {
    it('detects trick/hallucination-trap questions', () => {
      expect(isTrickQuestion('Does this contract mention mars colonization rights?')).toBe(true);
      expect(isTrickQuestion('Is there a clause about imaginary alien colonies?')).toBe(true);
    });

    it('returns false for legitimate legal questions', () => {
      expect(isTrickQuestion('What is the termination notice period?')).toBe(false);
      expect(isTrickQuestion('Who is responsible for indemnification?')).toBe(false);
    });

    it('handles empty string', () => {
      expect(isTrickQuestion('')).toBe(false);
    });
  });

  describe('validateRiskResponse', () => {
    it('validates a well-formed risk response', () => {
      const response = {
        overallScore: 75,
        riskLevel: 'high',
        flags: [
          {
            type: 'AUTO_RENEWAL',
            severity: 'high',
            sectionRef: 'Section 8.3',
            directQuote: 'automatically renew for successive one-year terms',
            explanation: 'Locks you in without timely cancellation.',
            recommendation: 'Negotiate 30-day notice window.',
          },
        ],
        missingProtections: ['Termination for convenience'],
        disclaimer: 'Not legal advice.',
      };
      const { valid, errors } = validateRiskResponse(response);
      expect(valid).toBe(true);
      expect(errors.length).toBe(0);
    });

    it('catches missing overallScore', () => {
      const response = { riskLevel: 'high', flags: [] };
      const { valid, errors } = validateRiskResponse(response);
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('overallScore'))).toBe(true);
    });

    it('catches invalid riskLevel', () => {
      const response = { overallScore: 50, riskLevel: 'extreme', flags: [] };
      const { valid, errors } = validateRiskResponse(response);
      expect(valid).toBe(false);
      expect(errors.some(e => e.includes('riskLevel'))).toBe(true);
    });

    it('catches flags without citations', () => {
      const response = {
        overallScore: 60,
        riskLevel: 'medium',
        flags: [{ type: 'AUTO_RENEWAL', severity: 'high', sectionRef: '', directQuote: '' }],
      };
      const { errors } = validateRiskResponse(response);
      expect(errors.some(e => e.includes('sectionRef'))).toBe(true);
      expect(errors.some(e => e.includes('directQuote'))).toBe(true);
    });
  });
});
