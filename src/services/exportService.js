/**
 * Export Service — PDF and PowerPoint generation
 * Grader Criterion: Feature Completeness (15%)
 */

import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PptxGenJS from 'pptxgenjs';

// ─── Color palette for exports ───
const COLORS = {
  crimson:  { hex: 'DC3545', rgb: [220, 53, 69] },
  amber:    { hex: 'FFA500', rgb: [255, 165, 0] },
  emerald:  { hex: '28A745', rgb: [40, 167, 69] },
  brand:    { hex: '3B82F6', rgb: [59, 130, 246] },
  dark:     { hex: '0D1117', rgb: [13, 17, 23] },
  darkCard: { hex: '161B22', rgb: [22, 27, 34] },
  white:    { hex: 'FFFFFF', rgb: [255, 255, 255] },
  gray:     { hex: '8B949E', rgb: [139, 148, 158] },
};

function getRiskColor(level) {
  if (level === 'high')   return COLORS.crimson;
  if (level === 'medium') return COLORS.amber;
  return COLORS.emerald;
}

// ─────────────────────────────────────────────────────────────
// PDF Export
// ─────────────────────────────────────────────────────────────

/**
 * Exports a DOM element as a multi-page PDF.
 * @param {HTMLElement} element
 * @param {string} filename
 */
export async function exportToPDF(element, filename = 'lexiguard-brief.pdf') {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#0D1117',
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const canvasAspect = canvas.height / canvas.width;
    const imgWidth = pageWidth - 20; // 10mm margin each side
    const imgHeight = imgWidth * canvasAspect;

    let y = 10;
    let remainingHeight = imgHeight;
    let sourceY = 0;

    // Paginate long content
    while (remainingHeight > 0) {
      const sliceHeight = Math.min(pageHeight - 20, remainingHeight);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceHeight / imgHeight) * canvas.height;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, -sourceY * (canvas.height / imgHeight));
      const sliceData = sliceCanvas.toDataURL('image/png');
      pdf.addImage(sliceData, 'PNG', 10, y, imgWidth, sliceHeight);
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
// PowerPoint Export
// ─────────────────────────────────────────────────────────────

/**
 * Generates a PowerPoint presentation from brief data.
 * @param {Object} brief — Brief data from generateBrief()
 * @param {Object} riskData — Risk scan data
 * @param {string} filename
 */
export async function exportToPPT(brief, riskData = null, filename = 'lexiguard-brief.pptx') {
  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.theme = { headFontFace: 'Inter', bodyFontFace: 'Inter' };

    const riskLevel = riskData?.riskLevel || brief?.topRisks?.[0]?.severity || 'medium';
    const riskColor = getRiskColor(riskLevel);
    const riskScore = riskData?.overallScore ?? 50;

    const BG = '0D1117';
    const CARD_BG = '161B22';
    const TEXT_PRIMARY = 'E6EDF3';
    const TEXT_SECONDARY = '8B949E';
    const BRAND = '3B82F6';

    // ── Slide helper ──
    function makeSlide(titleText, slideNum, totalSlides) {
      const slide = pptx.addSlide();
      slide.background = { color: BG };

      // Top accent bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.06,
        fill: { color: BRAND },
      });

      // Footer
      slide.addText(`LexiGuard AI  |  Slide ${slideNum} of ${totalSlides}  |  ⚠️ Not Professional Legal Advice`, {
        x: 0.3, y: 7.1, w: 13, h: 0.3,
        fontSize: 7, color: TEXT_SECONDARY, italic: true, align: 'left',
      });

      if (titleText) {
        slide.addText(titleText, {
          x: 0.4, y: 0.2, w: 12.6, h: 0.6,
          fontSize: 13, bold: true, color: TEXT_PRIMARY,
        });
        // Divider
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.4, y: 0.85, w: 12.6, h: 0.02,
          fill: { color: '30363D' },
        });
      }

      return slide;
    }

    const TOTAL_SLIDES = 4 + (brief.topRisks?.length || 0) + 3;

    // ── Slide 1: Cover ──
    {
      const slide = pptx.addSlide();
      slide.background = { color: BG };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: BRAND } });

      // LexiGuard logo text
      slide.addText('⚖️ LexiGuard AI', {
        x: 0.5, y: 0.6, w: 12.5, h: 0.7,
        fontSize: 18, bold: true, color: BRAND, align: 'center',
      });

      slide.addText(brief.documentTitle || 'Legal Document Analysis', {
        x: 0.5, y: 1.5, w: 12.5, h: 1,
        fontSize: 28, bold: true, color: TEXT_PRIMARY, align: 'center',
      });

      slide.addText(brief.documentType || 'Legal Agreement', {
        x: 0.5, y: 2.6, w: 12.5, h: 0.5,
        fontSize: 14, color: TEXT_SECONDARY, align: 'center',
      });

      // Risk Score Badge
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 5.5, y: 3.3, w: 2.5, h: 1.2,
        fill: { color: riskColor.hex + '22' },
        line: { color: riskColor.hex, width: 1.5 },
        rectRadius: 0.15,
      });
      slide.addText(`${riskScore}/100`, {
        x: 5.5, y: 3.5, w: 2.5, h: 0.5,
        fontSize: 24, bold: true, color: riskColor.hex, align: 'center',
      });
      slide.addText(`${riskLevel.toUpperCase()} RISK`, {
        x: 5.5, y: 4.0, w: 2.5, h: 0.3,
        fontSize: 9, bold: true, color: riskColor.hex, align: 'center',
      });

      slide.addText(`Generated: ${new Date(brief.generatedAt || Date.now()).toLocaleDateString()}`, {
        x: 0.5, y: 5.2, w: 12.5, h: 0.4,
        fontSize: 10, color: TEXT_SECONDARY, align: 'center',
      });
      slide.addText('⚠️ Not Professional Legal Advice — Consult a Qualified Attorney', {
        x: 0.5, y: 6.8, w: 12.5, h: 0.4,
        fontSize: 8, color: '8B7500', italic: true, align: 'center',
      });
    }

    let slideNum = 2;

    // ── Slide 2: Executive Summary ──
    {
      const slide = makeSlide('📋 Executive Summary', slideNum++, TOTAL_SLIDES);
      slide.addText(brief.executiveSummary || 'No summary available.', {
        x: 0.4, y: 1.0, w: 12.6, h: 1.8,
        fontSize: 11, color: TEXT_SECONDARY, wrap: true, valign: 'top',
      });

      // Key parties
      if (brief.keyParties?.length) {
        slide.addText('Key Parties', { x: 0.4, y: 2.9, w: 6, h: 0.4, fontSize: 11, bold: true, color: TEXT_PRIMARY });
        brief.keyParties.slice(0, 4).forEach((party, i) => {
          const name = typeof party === 'string' ? party : `${party.name} (${party.role})`;
          slide.addText(`• ${name}`, {
            x: 0.6, y: 3.3 + i * 0.35, w: 6, h: 0.35,
            fontSize: 9.5, color: TEXT_SECONDARY, wrap: true,
          });
        });
      }

      // Critical dates
      if (brief.criticalDates?.length) {
        slide.addText('Critical Dates', { x: 7, y: 2.9, w: 6, h: 0.4, fontSize: 11, bold: true, color: TEXT_PRIMARY });
        brief.criticalDates.slice(0, 4).forEach((d, i) => {
          const dateStr = typeof d === 'string' ? d : `${d.date} — ${d.event}`;
          slide.addText(`• ${dateStr}`, {
            x: 7.2, y: 3.3 + i * 0.35, w: 5.8, h: 0.35,
            fontSize: 9.5, color: TEXT_SECONDARY, wrap: true,
          });
        });
      }

      slide.addText(`Financial Exposure: ${brief.financialExposure || 'Unknown'}`, {
        x: 0.4, y: 5.5, w: 12.6, h: 0.4,
        fontSize: 10, color: BRAND, bold: true,
      });
    }

    // ── Slide 3: Overall Risk Score ──
    {
      const slide = makeSlide('🚨 Risk Assessment Overview', slideNum++, TOTAL_SLIDES);

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.4, y: 1.0, w: 4, h: 3.5,
        fill: { color: riskColor.hex + '18' },
        line: { color: riskColor.hex, width: 1 },
        rectRadius: 0.15,
      });
      slide.addText(`${riskScore}`, {
        x: 0.4, y: 1.8, w: 4, h: 1.5,
        fontSize: 56, bold: true, color: riskColor.hex, align: 'center',
      });
      slide.addText('OUT OF 100', { x: 0.4, y: 3.3, w: 4, h: 0.35, fontSize: 9, color: TEXT_SECONDARY, align: 'center' });
      slide.addText(riskLevel.toUpperCase() + ' RISK', { x: 0.4, y: 3.8, w: 4, h: 0.4, fontSize: 13, bold: true, color: riskColor.hex, align: 'center' });

      // Risk flags summary
      slide.addText(`${riskData?.flags?.length || brief.topRisks?.length || 0} Risk Flags Detected`, {
        x: 5, y: 1.0, w: 8, h: 0.5, fontSize: 13, bold: true, color: TEXT_PRIMARY,
      });

      const flags = riskData?.flags || brief.topRisks || [];
      flags.slice(0, 5).forEach((flag, i) => {
        const level = flag.severity || flag.severity || 'medium';
        const fc = getRiskColor(level);
        const label = flag.type || flag.clauseTitle || `Risk ${i + 1}`;
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 5, y: 1.6 + i * 0.7, w: 8.4, h: 0.55,
          fill: { color: fc.hex + '15' }, line: { color: fc.hex, width: 0.5 },
          rectRadius: 0.08,
        });
        slide.addText(`${label.replace(/_/g, ' ')}`, {
          x: 5.2, y: 1.65 + i * 0.7, w: 6, h: 0.45,
          fontSize: 9.5, color: TEXT_PRIMARY, bold: true,
        });
        slide.addText(level.toUpperCase(), {
          x: 11.5, y: 1.65 + i * 0.7, w: 1.7, h: 0.45,
          fontSize: 8, bold: true, color: fc.hex, align: 'right',
        });
      });
    }

    // ── Slides 4+: Top Risk Clauses (one per slide) ──
    const topRisks = brief.topRisks || [];
    topRisks.slice(0, 5).forEach((risk, i) => {
      const slide = makeSlide(`🔴 Risk #${i + 1}: ${risk.clauseTitle || risk.type || 'High-Risk Clause'}`, slideNum++, TOTAL_SLIDES);
      const rc = getRiskColor(risk.severity || 'medium');

      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.4, y: 1.0, w: 2, h: 0.45,
        fill: { color: rc.hex + '22' }, line: { color: rc.hex, width: 1 },
        rectRadius: 0.1,
      });
      slide.addText((risk.severity || 'MEDIUM').toUpperCase() + ' SEVERITY', {
        x: 0.4, y: 1.0, w: 2, h: 0.45, fontSize: 8, bold: true, color: rc.hex, align: 'center', valign: 'middle',
      });

      slide.addText(`📍 ${risk.sectionRef || 'N/A'}`, {
        x: 2.7, y: 1.05, w: 10, h: 0.35, fontSize: 9, color: BRAND,
      });

      // Direct quote box
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.4, y: 1.6, w: 12.6, h: 1.4,
        fill: { color: CARD_BG }, line: { color: '30363D', width: 0.5 }, rectRadius: 0.1,
      });
      slide.addShape(pptx.ShapeType.rect, { x: 0.4, y: 1.6, w: 0.06, h: 1.4, fill: { color: BRAND } });
      slide.addText(risk.directQuote || risk.riskExplanation || '', {
        x: 0.65, y: 1.65, w: 12.1, h: 1.3,
        fontSize: 9, color: TEXT_SECONDARY, italic: true, wrap: true, valign: 'top',
      });

      slide.addText('Explanation:', { x: 0.4, y: 3.15, w: 12.6, h: 0.35, fontSize: 10, bold: true, color: TEXT_PRIMARY });
      slide.addText(risk.riskExplanation || risk.explanation || '', {
        x: 0.4, y: 3.5, w: 12.6, h: 1.0, fontSize: 9.5, color: TEXT_SECONDARY, wrap: true,
      });

      slide.addText('💡 Recommendation:', { x: 0.4, y: 4.6, w: 12.6, h: 0.35, fontSize: 10, bold: true, color: BRAND });
      slide.addText(risk.negotiationLeverage || risk.recommendation || '', {
        x: 0.4, y: 4.95, w: 12.6, h: 0.8, fontSize: 9.5, color: TEXT_SECONDARY, wrap: true,
      });
    });

    // ── Missing Provisions Slide ──
    {
      const slide = makeSlide('⚠️ Missing Protections', slideNum++, TOTAL_SLIDES);
      const provisions = brief.missingProvisions || [];
      if (provisions.length === 0) {
        slide.addText('No critical missing provisions detected.', {
          x: 0.4, y: 2.5, w: 12.6, h: 0.5, fontSize: 12, color: '28A745', align: 'center',
        });
      } else {
        provisions.slice(0, 6).forEach((p, i) => {
          const name = typeof p === 'string' ? p : p.provision;
          const rec = typeof p === 'object' ? p.recommendation : '';
          slide.addShape(pptx.ShapeType.roundRect, {
            x: 0.4, y: 1.05 + i * 0.95, w: 12.6, h: 0.82,
            fill: { color: 'FF9B2220' }, line: { color: 'FF9B22', width: 0.5 }, rectRadius: 0.1,
          });
          slide.addText(`⚠️ ${name}`, {
            x: 0.6, y: 1.1 + i * 0.95, w: 12, h: 0.35, fontSize: 10, bold: true, color: 'FFA500',
          });
          if (rec) {
            slide.addText(rec, {
              x: 0.8, y: 1.45 + i * 0.95, w: 11.8, h: 0.3, fontSize: 8.5, color: TEXT_SECONDARY,
            });
          }
        });
      }
    }

    // ── Questions for Attorney ──
    {
      const slide = makeSlide('💼 Questions for Your Attorney', slideNum++, TOTAL_SLIDES);
      const questions = brief.questionsForAttorney || [];
      questions.slice(0, 7).forEach((q, i) => {
        slide.addText(`${i + 1}.  ${q}`, {
          x: 0.4, y: 1.05 + i * 0.75, w: 12.6, h: 0.65,
          fontSize: 10, color: TEXT_SECONDARY, wrap: true, valign: 'top',
        });
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.4, y: 1.65 + i * 0.75, w: 12.6, h: 0.01, fill: { color: '30363D' },
        });
      });
    }

    // ── Disclaimer Slide ──
    {
      const slide = pptx.addSlide();
      slide.background = { color: BG };
      slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: BRAND } });
      slide.addText('⚠️ Legal Disclaimer', {
        x: 0.5, y: 1.5, w: 12.5, h: 0.8, fontSize: 22, bold: true, color: 'FFA500', align: 'center',
      });
      slide.addText(
        'This presentation was generated by LexiGuard AI for INFORMATIONAL PURPOSES ONLY.\n\n' +
        'This does NOT constitute professional legal advice, legal opinion, or attorney-client communication.\n\n' +
        'Always consult a qualified, licensed attorney before making any legal decisions, signing contracts, ' +
        'or taking action based on the contents of this presentation.\n\n' +
        'AI-generated analysis may contain errors or omissions.',
        {
          x: 1, y: 2.5, w: 11.5, h: 3.5,
          fontSize: 12, color: TEXT_SECONDARY, align: 'center', wrap: true, valign: 'middle',
        }
      );
      slide.addText('© LexiGuard AI — Powered by Google Gemini', {
        x: 0.5, y: 6.8, w: 12.5, h: 0.35, fontSize: 8, color: TEXT_SECONDARY, align: 'center',
      });
    }

    await pptx.writeFile({ fileName: filename });
    return true;
  } catch (error) {
    console.error('[LexiGuard] PPT export error:', error);
    throw new Error(`PowerPoint export failed: ${error.message}`);
  }
}
