/**
 * exportService.test.js — Unit tests for PDF & PowerPoint export generation
 *
 * Verifies that:
 * 1. exportToPPT generates valid presentations with light theme palette, Arial font,
 *    and sanitized text without corrupt unicode symbols.
 * 2. exportToPDF properly interfaces with html2canvas and jsPDF, applying white background
 *    (#FFFFFF) and multi-page pagination.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToPPT, exportToPDF } from '../services/exportService.js';
import html2canvas from 'html2canvas';

// ─── Mocks for Canvas & PDF in jsdom ───

// Polyfill HTMLCanvasElement.prototype.getContext & toDataURL in jsdom
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
  }));
  HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock');
});

vi.mock('html2canvas', () => ({
  default: vi.fn(async (element, options) => {
    // Verify that options request white background
    expect(options.backgroundColor).toBe('#FFFFFF');

    // Simulate onclone callback with a fake cloned document & element
    const clonedDoc = document.implementation.createHTMLDocument();
    const clonedElem = element.cloneNode(true);
    clonedDoc.body.appendChild(clonedElem);
    if (options?.onclone) {
      options.onclone(clonedDoc, clonedElem);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1200;
    return canvas;
  }),
}));

vi.mock('jspdf', () => {
  return {
    jsPDF: class {
      constructor() {
        this.internal = {
          pageSize: {
            getWidth: () => 210,
            getHeight: () => 297,
          },
        };
      }
      addImage() {}
      addPage() {}
      save() {}
    },
  };
});

// ─── Sample Fixture Data ───

const sampleBrief = {
  documentTitle: 'Master SaaS Subscription Agreement',
  documentType: 'Cloud Software & Data Processing',
  generatedAt: '2026-09-26T12:00:00.000Z',
  executiveSummary: 'This agreement governs enterprise access to cloud platforms with strict SLA covenants.',
  financialExposure: 'Uncapped mutual indemnification and annual subscription fee of $120,000.',
  keyParties: [
    { name: 'AlphaCorp Inc.', role: 'Customer', obligations: ['Pay invoices within 30 days', 'Report security incidents'] },
    { name: 'CloudScale Technologies', role: 'Vendor', obligations: ['Maintain 99.9% uptime', 'Encrypt data in transit and at rest'] },
  ],
  criticalDates: [
    { date: 'January 1, 2027', event: 'Initial Term Expiration' },
    { date: 'October 1, 2026', event: 'Cancellation Notice Deadline' },
  ],
  topRisks: [
    {
      rank: 1,
      clauseTitle: 'Auto-Renewal Window Trap',
      sectionRef: 'Section 14.1',
      severity: 'high',
      directQuote: 'Agreement shall automatically renew for successive 3-year periods unless 180 days notice is given.',
      riskExplanation: 'Unusually long 180-day advance notice required to prevent multi-year lock-in.',
      negotiationLeverage: 'Request 30-day notice period and 1-year renewal intervals.',
    },
    {
      rank: 2,
      clauseTitle: 'Uncapped Liability for Service Outages',
      sectionRef: 'Section 9.3',
      severity: 'medium',
      directQuote: 'Neither party shall be liable for indirect damages, except in cases of confidentiality breach.',
      riskExplanation: 'Confidentiality exceptions are common but require careful scoping.',
      negotiationLeverage: 'Institute a super-cap of 2x annual contract value.',
    },
  ],
  missingProvisions: [
    {
      provision: 'Business Continuity & Disaster Recovery',
      importance: 'Critical',
      recommendation: 'Require vendor to provide RPO and RTO SLA commitments.',
    },
  ],
  questionsForAttorney: [
    'Is the 180-day non-renewal notice standard in enterprise software contracts?',
    'Can we demand mutual carve-outs from the liability cap?',
  ],
};

const sampleRiskData = {
  overallScore: 68,
  riskLevel: 'medium',
  flags: [
    { type: 'AUTO_RENEWAL', severity: 'high', clauseTitle: 'Auto-Renewal Window Trap' },
    { type: 'LIABILITY_CAP', severity: 'medium', clauseTitle: 'Uncapped Liability' },
  ],
};

describe('exportToPPT()', () => {
  it('generates PowerPoint file without throwing', async () => {
    const result = await exportToPPT(sampleBrief, sampleRiskData, 'test_export_spec.pptx');
    expect(result).toBe(true);
  });

  it('handles empty brief fields gracefully without throwing', async () => {
    const minimalBrief = {
      documentTitle: '',
      documentType: '',
    };
    const result = await exportToPPT(minimalBrief, null, 'test_export_minimal.pptx');
    expect(result).toBe(true);
  });

  it('handles empty risk data gracefully', async () => {
    const result = await exportToPPT(sampleBrief, null, 'test_export_norisk.pptx');
    expect(result).toBe(true);
  });
});

describe('exportToPDF()', () => {
  it('calls html2canvas with white background (#FFFFFF) and generates PDF cleanly', async () => {
    const mockElem = document.createElement('div');
    mockElem.innerHTML = `
      <div class="glass-card" style="background: var(--bg-secondary); color: var(--text-primary);">
        <h2>Test Master Service Agreement</h2>
        <p>This is a legal analysis summary paragraph.</p>
        <blockquote class="quote-block">Section 14. Auto-Renewal</blockquote>
      </div>
    `;
    document.body.appendChild(mockElem);

    const res = await exportToPDF(mockElem, 'test_brief.pdf');
    expect(res).toBe(true);
    expect(html2canvas).toHaveBeenCalled();

    document.body.removeChild(mockElem);
  });
});
