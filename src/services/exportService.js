/**
 * Export Service — PDF and PowerPoint generation
 * Generates crisp, high-contrast, professional documents with white background and dark text.
 * Optimized for readability, printability, and multi-platform presentation compatibility.
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';

// ─── Professional High-Contrast Palette (Light Mode) ───
const COLORS = {
  crimson: { hex: 'DC2626', lightHex: 'FEF2F2', borderHex: 'FECACA', textHex: '991B1B' },
  amber:   { hex: 'D97706', lightHex: 'FFFBEB', borderHex: 'FDE68A', textHex: '92400E' },
  emerald: { hex: '16A34A', lightHex: 'F0FDF4', borderHex: 'BBF7D0', textHex: '166534' },
  brand:   { hex: '2563EB', lightHex: 'EFF6FF', borderHex: 'BFDBFE', textHex: '1E40AF' },
  dark:    { hex: '0F172A' },
  body:    { hex: '334155' },
  muted:   { hex: '64748B' },
  white:   { hex: 'FFFFFF' },
  cardBg:  { hex: 'F8FAFC' },
  border:  { hex: 'E2E8F0' },
};

function getRiskColor(level) {
  const norm = String(level || '').toLowerCase();
  if (norm === 'high')   return COLORS.crimson;
  if (norm === 'medium') return COLORS.amber;
  return COLORS.emerald;
}

// ─────────────────────────────────────────────────────────────
// PDF Export — High-Contrast Light Theme
// ─────────────────────────────────────────────────────────────

/**
 * Exports a DOM element as a multi-page PDF formatted with a clean white background
 * and high-contrast dark text, suitable for printing and formal legal review.
 *
 * @param {HTMLElement} element
 * @param {string} [filename='lexiguard-brief.pdf']
 */
export async function exportToPDF(element, filename = 'lexiguard-brief.pdf') {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#FFFFFF',
      useCORS: true,
      logging: false,
      onclone: (clonedDoc, clonedElement) => {
        // 1. Inject light-mode overriding stylesheet into the cloned document
        const style = clonedDoc.createElement('style');
        style.id = 'pdf-light-export-styles';
        style.textContent = `
          body {
            background-color: #FFFFFF !important;
            color: #0F172A !important;
          }
          .pdf-export-root {
            background-color: #FFFFFF !important;
            color: #0F172A !important;
            padding: 24px !important;
          }
          .glass-card, [class*="glass-card"] {
            background-color: #FFFFFF !important;
            border: 1px solid #CBD5E1 !important;
            color: #0F172A !important;
          }
          h1, h2, h3, h4, h5, h6, strong, b {
            color: #0F172A !important;
          }
          p, li, span, div {
            color: #1E293B !important;
          }
          .quote-block, blockquote, pre, code {
            background-color: #F8FAFC !important;
            border-left: 3px solid #2563EB !important;
            color: #0F172A !important;
            padding: 12px 16px !important;
          }
          .divider, hr {
            background-color: #E2E8F0 !important;
            border: none !important;
            height: 1px !important;
          }
          .text-muted {
            color: #64748B !important;
          }
          .text-secondary {
            color: #334155 !important;
          }
          .disclaimer-banner {
            background-color: #FFFBEB !important;
            border: 1px solid #F59E0B !important;
            color: #92400E !important;
          }
        `;
        clonedDoc.head.appendChild(style);

        // 2. Normalize root element
        clonedElement.classList.add('pdf-export-root');
        clonedElement.style.background = '#FFFFFF';
        clonedElement.style.color = '#0F172A';

        // 3. Deep-normalize inline styles to avoid dark-theme remnants
        const allNodes = clonedElement.querySelectorAll('*');
        allNodes.forEach((node) => {
          // If cover header gradient is detected, convert to light executive tint
          if (node.style.background && node.style.background.includes('linear-gradient')) {
            node.style.background = 'linear-gradient(135deg, #F0F7FF, #FAF5FF)';
            node.style.borderColor = '#BFDBFE';
          }
          // Force light text colors to crisp dark slate
          const clr = node.style.color;
          if (clr && (clr.includes('210') || clr.includes('215') || clr.includes('#fff') || clr.includes('#e6') || clr.includes('#8b') || clr.includes('white'))) {
            node.style.color = '#1E293B';
          }
          // Force dark background containers to soft light slate
          const bg = node.style.background || node.style.backgroundColor;
          if (bg && (bg.includes('var(--bg-') || bg.includes('var(--glass-') || bg.includes('#0d') || bg.includes('#16') || bg.includes('hsl(222'))) {
            node.style.background = '#F8FAFC';
            node.style.borderColor = '#E2E8F0';
            node.style.color = '#0F172A';
          }
        });
      },
    });

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const canvasAspect = canvas.height / canvas.width;
    const imgWidth = pageWidth - 20; // 10mm margin each side
    const imgHeight = imgWidth * canvasAspect;

    const y = 10;
    let remainingHeight = imgHeight;
    let sourceY = 0;

    // Paginate long content with white background safety
    while (remainingHeight > 0) {
      const sliceHeight = Math.min(pageHeight - 20, remainingHeight);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceHeight / imgHeight) * canvas.height;
      const ctx = sliceCanvas.getContext('2d');

      // Guarantee clean white background on every canvas slice
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, -sourceY * (canvas.height / imgHeight));
      }
      const sliceData = sliceCanvas.toDataURL ? sliceCanvas.toDataURL('image/png') : '';
      if (sliceData) {
        pdf.addImage(sliceData, 'PNG', 10, y, imgWidth, sliceHeight);
      }

      remainingHeight -= sliceHeight;
      sourceY += sliceHeight;
      if (remainingHeight > 0) pdf.addPage();
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('[LexiGuard] PDF export error:', error);
    throw new Error(`PDF export failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// PowerPoint Export — High-Contrast Light Theme & Fixed Format
// ─────────────────────────────────────────────────────────────

/**
 * Strips raw emojis or replaces them with standard ASCII prefixes to prevent
 * font-fallback symbol substitution glitches in Office and WPS Office.
 * @param {string} text
 * @returns {string}
 */
function sanitizeForPpt(text) {
  if (!text) return '';
  return String(text)
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .trim();
}

/**
 * Generates an executive PowerPoint presentation with a white background,
 * dark high-contrast typography, and bulletproof font formatting across all viewers.
 *
 * @param {Object} brief — Brief data from generateBrief()
 * @param {Object} [riskData=null] — Risk scan data
 * @param {string} [filename='lexiguard-brief.pptx']
 */
export async function exportToPPT(brief, riskData = null, filename = 'lexiguard-brief.pptx') {
  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE'; // 16:9 widescreen layout

    // Universal standard system font available natively on all OS & Office versions
    const FONT_FACE = 'Arial';
    pptx.theme = { headFontFace: FONT_FACE, bodyFontFace: FONT_FACE };

    const riskLevel = String(riskData?.riskLevel || brief?.topRisks?.[0]?.severity || 'medium').toLowerCase();
    const riskColor = getRiskColor(riskLevel);
    const riskScore = riskData?.overallScore ?? 50;

    // Palette tokens for slides (all pure light theme)
    const BG             = COLORS.white.hex;       // 'FFFFFF'
    const CARD_BG        = COLORS.cardBg.hex;      // 'F8FAFC'
    const CARD_BORDER    = COLORS.border.hex;      // 'E2E8F0'
    const TEXT_PRIMARY   = COLORS.dark.hex;        // '0F172A'
    const TEXT_SECONDARY = COLORS.body.hex;        // '334155'
    const TEXT_MUTED     = COLORS.muted.hex;       // '64748B'
    const BRAND          = COLORS.brand.hex;       // '2563EB'
    const BRAND_LIGHT    = COLORS.brand.lightHex;  // 'EFF6FF'
    const BRAND_BORDER   = COLORS.brand.borderHex; // 'BFDBFE'

    // Helper: generates standard branded slide with white background and clean header
    function makeSlide(titleText, slideNum, totalSlides) {
      const slide = pptx.addSlide();
      slide.background = { color: BG };

      // Top brand accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.08,
        fill: { color: BRAND },
      });

      // Bottom footer
      slide.addText(`LexiGuard AI  |  Slide ${slideNum} of ${totalSlides}  |  Legal Consultation Preparation`, {
        x: 0.5, y: 7.1, w: 12.3, h: 0.3,
        fontSize: 8, color: TEXT_MUTED, fontFace: FONT_FACE, align: 'left',
      });

      if (titleText) {
        slide.addText(sanitizeForPpt(titleText), {
          x: 0.5, y: 0.25, w: 12.3, h: 0.55,
          fontSize: 14, bold: true, color: TEXT_PRIMARY, fontFace: FONT_FACE,
        });

        // Header bottom divider
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.5, y: 0.85, w: 12.3, h: 0.015,
          fill: { color: CARD_BORDER },
        });
      }

      return slide;
    }

    const TOTAL_SLIDES = 4 + (brief?.topRisks?.length || 0) + 3;

    // ── Slide 1: Cover Slide ──────────────────────────────────
    {
      const slide = pptx.addSlide();
      slide.background = { color: BG };

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: BRAND } });

      // Super-header / Platform tag
      slide.addText('LEXIGUARD AI  |  LEGAL CONSULTATION BRIEF', {
        x: 0.5, y: 0.8, w: 12.3, h: 0.4,
        fontSize: 11, bold: true, color: BRAND, align: 'center', fontFace: FONT_FACE,
      });

      // Document Title
      const titleClean = sanitizeForPpt(brief.documentTitle) || 'Contract Legal Analysis';
      slide.addText(titleClean, {
        x: 0.5, y: 1.5, w: 12.3, h: 1.1,
        fontSize: 26, bold: true, color: TEXT_PRIMARY, align: 'center', fontFace: FONT_FACE,
      });

      // Document Type
      const typeClean = sanitizeForPpt(brief.documentType) || 'Legal Agreement Review';
      slide.addText(typeClean, {
        x: 0.5, y: 2.65, w: 12.3, h: 0.4,
        fontSize: 13, color: TEXT_MUTED, align: 'center', fontFace: FONT_FACE,
      });

      // Central Risk Score Box (Light Card)
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.2, y: 3.3, w: 2.9, h: 1.4,
        fill: { color: riskColor.lightHex },
        line: { color: riskColor.hex, width: 1.5 },
        rectRadius: 0.12,
      });
      slide.addText(`${riskScore} / 100`, {
        x: 5.2, y: 3.45, w: 2.9, h: 0.6,
        fontSize: 26, bold: true, color: riskColor.textHex, align: 'center', fontFace: FONT_FACE,
      });
      slide.addText(`${riskLevel.toUpperCase()} RISK`, {
        x: 5.2, y: 4.05, w: 2.9, h: 0.35,
        fontSize: 10, bold: true, color: riskColor.textHex, align: 'center', fontFace: FONT_FACE,
      });

      // Generation Metadata
      const genDate = new Date(brief.generatedAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
      slide.addText(`Report Generated: ${genDate}`, {
        x: 0.5, y: 5.3, w: 12.3, h: 0.35,
        fontSize: 10, color: TEXT_MUTED, align: 'center', fontFace: FONT_FACE,
      });

      // Legal disclaimer footer
      slide.addText('LEGAL NOTICE: For Informational & Consultation Preparation Purposes Only', {
        x: 0.5, y: 6.7, w: 12.3, h: 0.35,
        fontSize: 8.5, color: TEXT_MUTED, italic: true, align: 'center', fontFace: FONT_FACE,
      });
    }

    let slideNum = 2;

    // ── Slide 2: Executive Summary ────────────────────────────
    {
      const slide = makeSlide('Executive Summary & Obligations', slideNum++, TOTAL_SLIDES);

      // Top Executive Summary Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 1.05, w: 12.3, h: 1.65,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08,
      });
      slide.addText(sanitizeForPpt(brief.executiveSummary) || 'No executive summary provided.', {
        x: 0.7, y: 1.15, w: 11.9, h: 1.45,
        fontSize: 10.5, color: TEXT_SECONDARY, wrap: true, valign: 'top', fontFace: FONT_FACE,
      });

      // Left Column: Key Parties
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 2.85, w: 5.95, h: 2.65,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08,
      });
      slide.addText('Key Parties & Roles', {
        x: 0.7, y: 3.0, w: 5.5, h: 0.35,
        fontSize: 11, bold: true, color: TEXT_PRIMARY, fontFace: FONT_FACE,
      });

      if (brief.keyParties?.length) {
        brief.keyParties.slice(0, 4).forEach((party, i) => {
          const name = typeof party === 'string' ? party : `${party.name} (${party.role || 'Party'})`;
          slide.addText(`•  ${sanitizeForPpt(name)}`, {
            x: 0.7, y: 3.4 + i * 0.45, w: 5.5, h: 0.4,
            fontSize: 9.5, color: TEXT_SECONDARY, wrap: true, fontFace: FONT_FACE,
          });
        });
      } else {
        slide.addText('No distinct party obligations identified.', {
          x: 0.7, y: 3.5, w: 5.5, h: 0.4, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_FACE,
        });
      }

      // Right Column: Critical Dates
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 6.85, y: 2.85, w: 5.95, h: 2.65,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08,
      });
      slide.addText('Critical Dates & Deadlines', {
        x: 7.05, y: 3.0, w: 5.5, h: 0.35,
        fontSize: 11, bold: true, color: TEXT_PRIMARY, fontFace: FONT_FACE,
      });

      if (brief.criticalDates?.length) {
        brief.criticalDates.slice(0, 4).forEach((d, i) => {
          const dateStr = typeof d === 'string' ? d : `${d.date} — ${d.event || 'Key event'}`;
          slide.addText(`•  ${sanitizeForPpt(dateStr)}`, {
            x: 7.05, y: 3.4 + i * 0.45, w: 5.5, h: 0.4,
            fontSize: 9.5, color: TEXT_SECONDARY, wrap: true, fontFace: FONT_FACE,
          });
        });
      } else {
        slide.addText('No critical dates extracted from document.', {
          x: 7.05, y: 3.5, w: 5.5, h: 0.4, fontSize: 9.5, color: TEXT_MUTED, fontFace: FONT_FACE,
        });
      }

      // Bottom Financial Exposure Bar
      if (brief.financialExposure) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 5.65, w: 12.3, h: 0.65,
          fill: { color: BRAND_LIGHT },
          line: { color: BRAND_BORDER, width: 1 },
          rectRadius: 0.08,
        });
        slide.addText(`Financial Exposure: ${sanitizeForPpt(brief.financialExposure)}`, {
          x: 0.7, y: 5.75, w: 11.9, h: 0.45,
          fontSize: 10, bold: true, color: COLORS.brand.textHex, fontFace: FONT_FACE,
        });
      }
    }

    // ── Slide 3: Risk Assessment Overview ─────────────────────
    {
      const slide = makeSlide('Risk Assessment Overview', slideNum++, TOTAL_SLIDES);

      // Left: Big Overall Score Card
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 1.05, w: 3.8, h: 5.3,
        fill: { color: riskColor.lightHex },
        line: { color: riskColor.borderHex, width: 1.5 },
        rectRadius: 0.1,
      });

      slide.addText('OVERALL RISK SCORE', {
        x: 0.5, y: 1.4, w: 3.8, h: 0.35,
        fontSize: 10, bold: true, color: riskColor.textHex, align: 'center', fontFace: FONT_FACE,
      });
      slide.addText(`${riskScore}`, {
        x: 0.5, y: 2.1, w: 3.8, h: 1.4,
        fontSize: 56, bold: true, color: riskColor.hex, align: 'center', fontFace: FONT_FACE,
      });
      slide.addText('OUT OF 100', {
        x: 0.5, y: 3.7, w: 3.8, h: 0.35,
        fontSize: 9, color: TEXT_MUTED, align: 'center', fontFace: FONT_FACE,
      });
      slide.addText(`${riskLevel.toUpperCase()} RISK RATING`, {
        x: 0.5, y: 4.3, w: 3.8, h: 0.4,
        fontSize: 12, bold: true, color: riskColor.textHex, align: 'center', fontFace: FONT_FACE,
      });

      // Right: Risk Flags Summary List
      const flags = riskData?.flags || brief.topRisks || [];
      slide.addText(`Detected Risk Factors (${flags.length})`, {
        x: 4.6, y: 1.05, w: 8.2, h: 0.4,
        fontSize: 12, bold: true, color: TEXT_PRIMARY, fontFace: FONT_FACE,
      });

      flags.slice(0, 5).forEach((flag, i) => {
        const level = String(flag.severity || 'medium').toLowerCase();
        const fc = getRiskColor(level);
        const label = sanitizeForPpt(flag.type || flag.clauseTitle || `Risk Factor ${i + 1}`).replace(/_/g, ' ');

        slide.addShape(pptx.ShapeType.roundRect, {
          x: 4.6, y: 1.6 + i * 0.85, w: 8.2, h: 0.7,
          fill: { color: fc.lightHex },
          line: { color: fc.borderHex, width: 1 },
          rectRadius: 0.08,
        });
        slide.addText(label, {
          x: 4.8, y: 1.7 + i * 0.85, w: 6.0, h: 0.5,
          fontSize: 10, bold: true, color: TEXT_PRIMARY, fontFace: FONT_FACE,
        });
        slide.addText(level.toUpperCase(), {
          x: 10.9, y: 1.7 + i * 0.85, w: 1.7, h: 0.5,
          fontSize: 8.5, bold: true, color: fc.textHex, align: 'right', fontFace: FONT_FACE,
        });
      });
    }

    // ── Slides 4+: Individual Risk Clauses ───────────────────
    const topRisks = brief.topRisks || [];
    topRisks.slice(0, 5).forEach((risk, i) => {
      const cleanTitle = sanitizeForPpt(risk.clauseTitle || risk.type || 'High-Risk Clause');
      const slide = makeSlide(`Risk Factor #${i + 1}: ${cleanTitle}`, slideNum++, TOTAL_SLIDES);
      const rc = getRiskColor(risk.severity);

      // Severity Pill
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 1.05, w: 2.2, h: 0.4,
        fill: { color: rc.lightHex },
        line: { color: rc.borderHex, width: 1 },
        rectRadius: 0.08,
      });
      slide.addText(`${String(risk.severity || 'MEDIUM').toUpperCase()} SEVERITY`, {
        x: 0.5, y: 1.05, w: 2.2, h: 0.4,
        fontSize: 8.5, bold: true, color: rc.textHex, align: 'center', valign: 'middle', fontFace: FONT_FACE,
      });

      // Section Reference
      const refText = risk.sectionRef ? `Section: ${sanitizeForPpt(risk.sectionRef)}` : 'Section: General Provision';
      slide.addText(refText, {
        x: 2.9, y: 1.1, w: 9.9, h: 0.35,
        fontSize: 9.5, bold: true, color: BRAND, fontFace: FONT_FACE,
      });

      // Verbatim Quote Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 1.6, w: 12.3, h: 1.5,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1 },
        rectRadius: 0.08,
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5, y: 1.6, w: 0.08, h: 1.5,
        fill: { color: BRAND },
      });
      slide.addText(sanitizeForPpt(risk.directQuote || risk.riskExplanation) || 'No specific text extract provided.', {
        x: 0.8, y: 1.7, w: 11.8, h: 1.3,
        fontSize: 9.5, color: TEXT_PRIMARY, italic: true, wrap: true, valign: 'top', fontFace: FONT_FACE,
      });

      // Legal Analysis & Impact
      slide.addText('Legal Analysis & Risk Exposure:', {
        x: 0.5, y: 3.3, w: 12.3, h: 0.35,
        fontSize: 10.5, bold: true, color: TEXT_PRIMARY, fontFace: FONT_FACE,
      });
      slide.addText(sanitizeForPpt(risk.riskExplanation || risk.explanation) || 'Clause contains terms that may unfavorably shift liability or obligations.', {
        x: 0.5, y: 3.7, w: 12.3, h: 1.1,
        fontSize: 9.5, color: TEXT_SECONDARY, wrap: true, fontFace: FONT_FACE,
      });

      // Actionable Recommendation Box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 5.0, w: 12.3, h: 1.4,
        fill: { color: BRAND_LIGHT },
        line: { color: BRAND_BORDER, width: 1 },
        rectRadius: 0.08,
      });
      slide.addText('Actionable Negotiation Strategy:', {
        x: 0.7, y: 5.15, w: 11.9, h: 0.35,
        fontSize: 10, bold: true, color: COLORS.brand.textHex, fontFace: FONT_FACE,
      });
      slide.addText(sanitizeForPpt(risk.negotiationLeverage || risk.recommendation) || 'Consult your attorney to propose reciprocal terms or cap liability.', {
        x: 0.7, y: 5.5, w: 11.9, h: 0.8,
        fontSize: 9.5, color: TEXT_SECONDARY, wrap: true, fontFace: FONT_FACE,
      });
    });

    // ── Slide: Missing Protections ────────────────────────────
    {
      const slide = makeSlide('Missing Protective Provisions', slideNum++, TOTAL_SLIDES);
      const provisions = brief.missingProvisions || [];

      if (provisions.length === 0) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 2.2, w: 12.3, h: 1.5,
          fill: { color: COLORS.emerald.lightHex },
          line: { color: COLORS.emerald.borderHex, width: 1 },
          rectRadius: 0.08,
        });
        slide.addText('Standard Protective Provisions Detected', {
          x: 0.5, y: 2.6, w: 12.3, h: 0.45,
          fontSize: 14, bold: true, color: COLORS.emerald.textHex, align: 'center', fontFace: FONT_FACE,
        });
        slide.addText('No critical missing clauses (such as mutual indemnity, IP carve-outs, or fee recovery) were flagged.', {
          x: 0.5, y: 3.1, w: 12.3, h: 0.4,
          fontSize: 10, color: TEXT_SECONDARY, align: 'center', fontFace: FONT_FACE,
        });
      } else {
        provisions.slice(0, 5).forEach((p, i) => {
          const name = sanitizeForPpt(typeof p === 'string' ? p : p.provision);
          const rec = sanitizeForPpt(typeof p === 'object' ? p.recommendation : '');

          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.5, y: 1.1 + i * 1.0, w: 12.3, h: 0.88,
            fill: { color: COLORS.amber.lightHex },
            line: { color: COLORS.amber.borderHex, width: 1 },
            rectRadius: 0.08,
          });
          slide.addText(`Missing: ${name}`, {
            x: 0.7, y: 1.18 + i * 1.0, w: 11.9, h: 0.35,
            fontSize: 10, bold: true, color: COLORS.amber.textHex, fontFace: FONT_FACE,
          });
          if (rec) {
            slide.addText(`Recommendation: ${rec}`, {
              x: 0.7, y: 1.53 + i * 1.0, w: 11.9, h: 0.35,
              fontSize: 9, color: TEXT_SECONDARY, fontFace: FONT_FACE,
            });
          }
        });
      }
    }

    // ── Slide: Questions for Attorney ─────────────────────────
    {
      const slide = makeSlide('Questions for Legal Counsel', slideNum++, TOTAL_SLIDES);
      const questions = brief.questionsForAttorney || [];

      questions.slice(0, 6).forEach((q, i) => {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 1.1 + i * 0.88, w: 12.3, h: 0.75,
          fill: { color: CARD_BG },
          line: { color: CARD_BORDER, width: 1 },
          rectRadius: 0.08,
        });
        slide.addText(`${i + 1}.`, {
          x: 0.7, y: 1.25 + i * 0.88, w: 0.4, h: 0.45,
          fontSize: 10, bold: true, color: BRAND, fontFace: FONT_FACE,
        });
        slide.addText(sanitizeForPpt(q), {
          x: 1.2, y: 1.2 + i * 0.88, w: 11.4, h: 0.55,
          fontSize: 9.5, color: TEXT_SECONDARY, wrap: true, valign: 'middle', fontFace: FONT_FACE,
        });
      });
    }

    // ── Slide: Legal Disclaimer ───────────────────────────────
    {
      const slide = pptx.addSlide();
      slide.background = { color: BG };

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { color: BRAND } });

      // Centered disclaimer card
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 1.5, y: 1.2, w: 10.3, h: 5.0,
        fill: { color: CARD_BG },
        line: { color: CARD_BORDER, width: 1.5 },
        rectRadius: 0.12,
      });

      slide.addText('Legal Disclaimer & Terms of Use', {
        x: 1.5, y: 1.6, w: 10.3, h: 0.5,
        fontSize: 18, bold: true, color: TEXT_PRIMARY, align: 'center', fontFace: FONT_FACE,
      });

      slide.addText(
        'This briefing was generated by LexiGuard AI for INFORMATIONAL PURPOSES ONLY.\n\n' +
        '1. LexiGuard AI is not a law firm and does NOT provide formal legal advice, legal representation, or legal opinions.\n\n' +
        '2. No attorney-client relationship is formed through the generation or viewing of this presentation.\n\n' +
        '3. Always engage a licensed, qualified attorney in your jurisdiction before executing contracts, modifying legal provisions, or waiving contractual rights.\n\n' +
        '4. Automated analysis may contain inaccuracies, omissions, or misinterpretations of complex multi-jurisdictional clauses.',
        {
          x: 2.0, y: 2.3, w: 9.3, h: 3.2,
          fontSize: 10.5, color: TEXT_SECONDARY, align: 'center', wrap: true, valign: 'top', fontFace: FONT_FACE,
        }
      );

      slide.addText('© 2026 LexiGuard AI — Legal Intelligence Platform', {
        x: 0.5, y: 6.8, w: 12.3, h: 0.35,
        fontSize: 8.5, color: TEXT_MUTED, align: 'center', fontFace: FONT_FACE,
      });
    }

    await pptx.writeFile({ fileName: filename });
    return true;
  } catch (error) {
    console.error('[LexiGuard] PPT export error:', error);
    throw new Error(`PowerPoint export failed: ${error.message}`);
  }
}
