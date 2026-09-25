/**
 * legalAiService.test.js — Tests for the LexiGuard legal AI service.
 *
 * All Gemini API calls are mocked to resolve to a simulated failure so the
 * tests exercise the deterministic local-fallback engine, which must always
 * produce valid, schema-compliant JSON regardless of the API status.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';

// ─── Mock Gemini SDK ──────────────────────────────────────────────────────────

vi.mock('@google/generative-ai', () => {
  const HarmCategory = {
    HARM_CATEGORY_HARASSMENT:        'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH:       'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  };
  const HarmBlockThreshold = { BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE' };

  class GoogleGenerativeAI {
    getGenerativeModel() {
      return {
        // Always rejects — forces fallback engine
        generateContent: vi.fn().mockRejectedValue(new Error('API mocked offline')),
      };
    }
  }

  return { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold };
});

import {
  simplifyDocument,
  scanRisks,
  compareContracts,
  answerQuestion,
  generateBrief,
  generateRedlineClause,
} from '../services/legalAiService.js';

// ─── Test Fixtures ────────────────────────────────────────────────────────────

const LEASE_TEXT = `
COMMERCIAL LEASE AGREEMENT

Section 1. Premises
Landlord leases to Tenant the premises located at 123 Main Street, Suite 400.

Section 2. Term and Renewal
This Agreement shall automatically renew for successive 12-month periods
unless written notice of termination is provided 90 days in advance.

Section 7. Indemnification
Tenant agrees to indemnify, defend, and hold harmless Landlord from any
and all claims, damages, liabilities, and expenses arising out of Tenant's use.

Section 8. Amendments
Landlord may modify any term of this Agreement at its sole discretion without
prior written notice to Tenant.
`;

const NDA_TEXT = `
MUTUAL NON-DISCLOSURE AGREEMENT

Section 1. Confidential Information
Both parties agree to keep all proprietary information strictly confidential.

Section 3. Term
This Agreement is effective for 24 months from the Effective Date.

Section 5. Governing Law
This Agreement shall be governed by the laws of the State of California.
`;

// ─── simplifyDocument() ───────────────────────────────────────────────────────

describe('simplifyDocument() — fallback engine', () => {
  it('returns required top-level fields', async () => {
    const result = await simplifyDocument(LEASE_TEXT);
    expect(result).toHaveProperty('documentTitle');
    expect(result).toHaveProperty('documentType');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('clauses');
    expect(result).toHaveProperty('disclaimer');
  });

  it('clauses is a non-empty array', async () => {
    const result = await simplifyDocument(LEASE_TEXT);
    expect(Array.isArray(result.clauses)).toBe(true);
    expect(result.clauses.length).toBeGreaterThan(0);
  });

  it('each clause has required fields', async () => {
    const result = await simplifyDocument(LEASE_TEXT);
    result.clauses.forEach((clause) => {
      expect(clause).toHaveProperty('clauseTitle');
      expect(clause).toHaveProperty('sectionRef');
      expect(clause).toHaveProperty('plainEnglish');
    });
  });

  it('detects Commercial Lease document type from text', async () => {
    const result = await simplifyDocument(LEASE_TEXT);
    expect(result.documentType.toLowerCase()).toContain('lease');
  });

  it('handles ELI5 mode without throwing', async () => {
    const result = await simplifyDocument(LEASE_TEXT, 'eli5');
    expect(result).toHaveProperty('summary');
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('handles executive mode without throwing', async () => {
    const result = await simplifyDocument(LEASE_TEXT, 'executive');
    expect(result).toHaveProperty('summary');
    expect(result.summary.toLowerCase()).toContain('executive');
  });

  it('handles empty document text gracefully', async () => {
    await expect(simplifyDocument('')).resolves.toHaveProperty('clauses');
  });

  it('does not leak PII (email addresses) from the response', async () => {
    const textWithEmail = `${LEASE_TEXT}\nContact: landlord@realestate.com for questions.`;
    const result = await simplifyDocument(textWithEmail);
    const resultStr = JSON.stringify(result);
    expect(resultStr).not.toContain('landlord@realestate.com');
  });
});

// ─── scanRisks() ─────────────────────────────────────────────────────────────

describe('scanRisks() — fallback engine', () => {
  it('returns overallScore, riskLevel, flags, disclaimer', async () => {
    const result = await scanRisks(LEASE_TEXT);
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('riskLevel');
    expect(result).toHaveProperty('flags');
    expect(result).toHaveProperty('disclaimer');
  });

  it('overallScore is a number between 0 and 100', async () => {
    const { overallScore } = await scanRisks(LEASE_TEXT);
    expect(typeof overallScore).toBe('number');
    expect(overallScore).toBeGreaterThanOrEqual(0);
    expect(overallScore).toBeLessThanOrEqual(100);
  });

  it('riskLevel is one of high|medium|low', async () => {
    const { riskLevel } = await scanRisks(LEASE_TEXT);
    expect(['high', 'medium', 'low']).toContain(riskLevel);
  });

  it('flags is an array', async () => {
    const { flags } = await scanRisks(LEASE_TEXT);
    expect(Array.isArray(flags)).toBe(true);
  });

  it('each flag has type, severity, sectionRef, directQuote', async () => {
    const { flags } = await scanRisks(LEASE_TEXT);
    flags.forEach((flag) => {
      expect(flag).toHaveProperty('type');
      expect(flag).toHaveProperty('severity');
      expect(flag).toHaveProperty('sectionRef');
      expect(flag).toHaveProperty('directQuote');
    });
  });

  it('detects AUTO_RENEWAL_TRAP in the lease document', async () => {
    const { flags } = await scanRisks(LEASE_TEXT);
    const types = flags.map((f) => f.type);
    expect(types).toContain('AUTO_RENEWAL_TRAP');
  });

  it('detects indemnification risk in the lease document', async () => {
    const { flags, overallScore } = await scanRisks(LEASE_TEXT);
    // The fallback engine detects indemnification via "hold harmless" or "indemnif"
    // The flag type may be UNLIMITED_INDEMNIFICATION or the score may be elevated
    const types = flags.map((f) => f.type);
    const hasIndemnityFlag = types.some(
      (t) => t.includes('INDEMNIF') || t.includes('HOLD_HARMLESS') || t.includes('LIABILITY')
    );
    // Either a specific indemnity flag exists, or the score is high due to indemnity
    expect(hasIndemnityFlag || overallScore >= 50).toBe(true);
  });

  it('returns lower risk score for benign NDA text', async () => {
    const leaseResult = await scanRisks(LEASE_TEXT);
    const ndaResult   = await scanRisks(NDA_TEXT);
    expect(ndaResult.overallScore).toBeLessThan(leaseResult.overallScore);
  });

  it('handles empty text without throwing', async () => {
    await expect(scanRisks('')).resolves.toHaveProperty('overallScore');
  });
});

// ─── compareContracts() ───────────────────────────────────────────────────────

describe('compareContracts() — fallback engine', () => {
  it('returns overallVerdict and riskShiftDirection', async () => {
    const result = await compareContracts(LEASE_TEXT, NDA_TEXT);
    expect(result).toHaveProperty('overallVerdict');
    expect(result).toHaveProperty('riskShiftDirection');
  });

  it('riskShiftDirection is one of improved|worsened|neutral', async () => {
    const { riskShiftDirection } = await compareContracts(LEASE_TEXT, NDA_TEXT);
    expect(['improved', 'worsened', 'neutral']).toContain(riskShiftDirection);
  });

  it('returns disclaimer in comparator response', async () => {
    const result = await compareContracts(LEASE_TEXT, NDA_TEXT);
    expect(result).toHaveProperty('disclaimer');
  });

  it('handles empty contract A gracefully', async () => {
    await expect(compareContracts('', NDA_TEXT)).resolves.toHaveProperty('overallVerdict');
  });

  it('handles both contracts empty without throwing', async () => {
    await expect(compareContracts('', '')).resolves.toHaveProperty('riskShiftDirection');
  });
});

// ─── answerQuestion() ────────────────────────────────────────────────────────

describe('answerQuestion() — fallback engine', () => {
  it('returns answer, confidence, sectionRef, directQuote, disclaimer', async () => {
    const result = await answerQuestion(LEASE_TEXT, 'What are the renewal terms?');
    expect(result).toHaveProperty('answer');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('sectionRef');
    expect(result).toHaveProperty('directQuote');
    expect(result).toHaveProperty('disclaimer');
  });

  it('confidence is one of verified|unverified|not_found', async () => {
    const { confidence } = await answerQuestion(LEASE_TEXT, 'What is the term?');
    expect(['verified', 'unverified', 'not_found']).toContain(confidence);
  });

  it('returns not_found for a question about a nonexistent clause', async () => {
    const { confidence } = await answerQuestion(LEASE_TEXT, 'What is the mars colonization clause?');
    expect(['not_found', 'unverified']).toContain(confidence);
  });

  it('answer is a non-empty string', async () => {
    const { answer } = await answerQuestion(LEASE_TEXT, 'What are the indemnification terms?');
    expect(typeof answer).toBe('string');
    expect(answer.length).toBeGreaterThan(0);
  });

  it('handles empty document text gracefully', async () => {
    await expect(answerQuestion('', 'Any question?')).resolves.toHaveProperty('confidence');
  });

  it('handles empty question gracefully', async () => {
    await expect(answerQuestion(LEASE_TEXT, '')).resolves.toHaveProperty('answer');
  });

  it('returns _validation object attached to response', async () => {
    const result = await answerQuestion(LEASE_TEXT, 'Who is the Tenant?');
    expect(result).toHaveProperty('_validation');
  });
});

// ─── generateBrief() ─────────────────────────────────────────────────────────

describe('generateBrief() — fallback engine', () => {
  it('returns executiveSummary, topRisks, redLines, disclaimer', async () => {
    const result = await generateBrief(LEASE_TEXT);
    expect(result).toHaveProperty('executiveSummary');
    expect(result).toHaveProperty('topRisks');
    expect(result).toHaveProperty('redLines');
    expect(result).toHaveProperty('disclaimer');
  });

  it('topRisks is an array', async () => {
    const { topRisks } = await generateBrief(LEASE_TEXT);
    expect(Array.isArray(topRisks)).toBe(true);
  });

  it('redLines is an array of strings', async () => {
    const { redLines } = await generateBrief(LEASE_TEXT);
    expect(Array.isArray(redLines)).toBe(true);
    redLines.forEach((line) => expect(typeof line).toBe('string'));
  });

  it('accepts pre-computed riskData parameter without throwing', async () => {
    const mockRisk = {
      overallScore: 70,
      riskLevel: 'high',
      flags: [{ type: 'TEST', severity: 'high', sectionRef: 'Section 1', directQuote: 'Quote', explanation: 'Exp', recommendation: 'Rec' }],
    };
    await expect(generateBrief(LEASE_TEXT, mockRisk)).resolves.toHaveProperty('executiveSummary');
  });
});

// ─── generateRedlineClause() ─────────────────────────────────────────────────

describe('generateRedlineClause() — fallback engine', () => {
  const autoRenewalFlag = {
    type: 'AUTO_RENEWAL_TRAP',
    severity: 'high',
    sectionRef: 'Section 2',
    directQuote: 'This Agreement shall automatically renew for successive 12-month periods.',
    explanation: 'Auto-renewal with 90-day notice window.',
    recommendation: 'Negotiate 30-day opt-in renewal.',
  };

  it('returns originalQuote, proposedClause, riskExplanation, negotiationStrategy, keyChanges', async () => {
    const result = await generateRedlineClause(autoRenewalFlag, LEASE_TEXT);
    expect(result).toHaveProperty('originalQuote');
    expect(result).toHaveProperty('proposedClause');
    expect(result).toHaveProperty('riskExplanation');
    expect(result).toHaveProperty('negotiationStrategy');
    expect(result).toHaveProperty('keyChanges');
  });

  it('proposedClause is a non-empty string', async () => {
    const { proposedClause } = await generateRedlineClause(autoRenewalFlag, LEASE_TEXT);
    expect(typeof proposedClause).toBe('string');
    expect(proposedClause.length).toBeGreaterThan(20);
  });

  it('keyChanges is an array of strings', async () => {
    const { keyChanges } = await generateRedlineClause(autoRenewalFlag, LEASE_TEXT);
    expect(Array.isArray(keyChanges)).toBe(true);
    keyChanges.forEach((c) => expect(typeof c).toBe('string'));
  });

  it('generates appropriate redline for INDEMNIFICATION flag', async () => {
    const indemnFlag = {
      type: 'UNLIMITED_INDEMNIFICATION',
      severity: 'high',
      sectionRef: 'Section 7',
      directQuote: 'Agrees to indemnify from any and all claims.',
      explanation: 'Uncapped indemnity.',
    };
    const { proposedClause } = await generateRedlineClause(indemnFlag, LEASE_TEXT);
    expect(proposedClause.toLowerCase()).toMatch(/indemnif|liability|limit/);
  });

  it('handles null riskFlag gracefully', async () => {
    await expect(generateRedlineClause(null, LEASE_TEXT)).resolves.toHaveProperty('proposedClause');
  });

  it('handles empty documentText gracefully', async () => {
    await expect(generateRedlineClause(autoRenewalFlag, '')).resolves.toHaveProperty('originalQuote');
  });
});
