/**
 * fileParser.test.js — Tests for the multi-format document parser utility.
 *
 * PDF.js and mammoth.js are mocked so tests run in the Node test environment
 * without requiring real binary files or a browser DOM.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock pdf.js ──────────────────────────────────────────────────────────────

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(({ data }) => ({
    promise: Promise.resolve({
      numPages: 3,
      getPage: vi.fn((pageNum) =>
        Promise.resolve({
          getTextContent: vi.fn(() =>
            Promise.resolve({
              items: [{ str: `Page ${pageNum} content sample text from PDF document.` }],
            })
          ),
        })
      ),
    }),
  })),
}));

// ─── Mock mammoth.js ──────────────────────────────────────────────────────────

vi.mock('mammoth', () => ({
  default: {
    extractRawText: vi.fn(() =>
      Promise.resolve({
        value: 'COMMERCIAL LEASE AGREEMENT\n\nSection 1. Premises\nLandlord agrees to lease Suite 400.\n\nSection 2. Term\nInitial term 24 months.',
      })
    ),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import {
  parsePDF,
  parseDOCX,
  imageToBase64,
  parseFile,
  formatFileSize,
  ACCEPTED_FILE_TYPES,
} from '../utils/fileParser.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Creates a minimal File-like object accepted by the parser utilities.
 * Adds a proper `arrayBuffer()` implementation because jsdom's built-in
 * File API does not implement it (it's a browser-only method).
 *
 * @param {string} name
 * @param {string} type
 * @param {string|Uint8Array} content
 * @returns {File & { arrayBuffer: () => Promise<ArrayBuffer> }}
 */
function makeFile(name, type, content = 'dummy content') {
  const file = new File([content], name, { type });
  // Polyfill arrayBuffer() for jsdom
  file.arrayBuffer = () => {
    const encoder = new TextEncoder();
    const bytes = typeof content === 'string' ? encoder.encode(content) : content;
    return Promise.resolve(bytes.buffer);
  };
  return file;
}


// ─── parsePDF() ───────────────────────────────────────────────────────────────

describe('parsePDF()', () => {
  it('returns text, pageCount, sourceType, filename', async () => {
    const file = makeFile('contract.pdf', 'application/pdf');
    const result = await parsePDF(file);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('pageCount');
    expect(result).toHaveProperty('sourceType', 'pdf');
    expect(result).toHaveProperty('filename', 'contract.pdf');
  });

  it('pageCount matches the mocked PDF page count (3)', async () => {
    const file = makeFile('contract.pdf', 'application/pdf');
    const { pageCount } = await parsePDF(file);
    expect(pageCount).toBe(3);
  });

  it('extracted text is a non-empty string', async () => {
    const file = makeFile('agreement.pdf', 'application/pdf');
    const { text } = await parsePDF(file);
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(0);
  });

  it('includes page markers [Page N] in extracted text', async () => {
    const file = makeFile('report.pdf', 'application/pdf');
    const { text } = await parsePDF(file);
    expect(text).toContain('[Page 1]');
  });
});

// ─── parseDOCX() ─────────────────────────────────────────────────────────────

describe('parseDOCX()', () => {
  it('returns text, pageCount, sourceType, filename', async () => {
    const file = makeFile('lease.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const result = await parseDOCX(file);
    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('pageCount');
    expect(result).toHaveProperty('sourceType', 'docx');
    expect(result).toHaveProperty('filename', 'lease.docx');
  });

  it('text contains the mocked mammoth content', async () => {
    const file = makeFile('nda.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const { text } = await parseDOCX(file);
    expect(text).toContain('COMMERCIAL LEASE AGREEMENT');
  });

  it('pageCount is at least 1', async () => {
    const file = makeFile('brief.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const { pageCount } = await parseDOCX(file);
    expect(pageCount).toBeGreaterThanOrEqual(1);
  });
});

// ─── imageToBase64() ─────────────────────────────────────────────────────────

describe('imageToBase64()', () => {
  beforeEach(() => {
    // FileReader is available in jsdom (Vitest default test environment)
    if (typeof FileReader === 'undefined') {
      globalThis.FileReader = class {
        readAsDataURL() {
          this.result = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
          if (this.onload) this.onload();
        }
      };
    }
  });

  it('returns base64, mimeType, filename for an image file', async () => {
    const file = makeFile('scan.png', 'image/png', 'fake image data');
    const result = await imageToBase64(file);
    expect(result).toHaveProperty('base64');
    expect(result).toHaveProperty('mimeType', 'image/png');
    expect(result).toHaveProperty('filename', 'scan.png');
  });

  it('base64 string does not contain the data-URI prefix', async () => {
    const file = makeFile('scan.png', 'image/png', 'data');
    const { base64 } = await imageToBase64(file);
    expect(base64).not.toContain('data:');
    expect(base64).not.toContain(',');
  });
});

// ─── parseFile() ─────────────────────────────────────────────────────────────

describe('parseFile()', () => {
  it('routes PDF files to parsePDF', async () => {
    const file = makeFile('contract.pdf', 'application/pdf');
    const result = await parseFile(file);
    expect(result.sourceType).toBe('pdf');
  });

  it('routes DOCX files to parseDOCX', async () => {
    const file = makeFile('nda.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const result = await parseFile(file);
    expect(result.sourceType).toBe('docx');
  });

  it('routes PNG images to imageToBase64 (isImage: true)', async () => {
    const file = makeFile('scan.png', 'image/png', 'image data');
    const result = await parseFile(file);
    expect(result.isImage).toBe(true);
    expect(result.sourceType).toBe('image');
  });

  it('routes JPEG images correctly', async () => {
    const file = makeFile('photo.jpg', 'image/jpeg', 'jpeg data');
    const result = await parseFile(file);
    expect(result.isImage).toBe(true);
  });

  it('throws a descriptive error for unsupported file types', async () => {
    const file = makeFile('virus.exe', 'application/octet-stream', 'binary');
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
  });

  it('throws a descriptive error for .txt files', async () => {
    const file = makeFile('notes.txt', 'text/plain', 'some text');
    await expect(parseFile(file)).rejects.toThrow('Unsupported file type');
  });

  it('throws when no file is provided', async () => {
    await expect(parseFile(null)).rejects.toThrow('No file provided');
    await expect(parseFile(undefined)).rejects.toThrow('No file provided');
  });

  it('routes .webp extension to image parser', async () => {
    const file = makeFile('snapshot.webp', 'image/webp', 'webp data');
    const result = await parseFile(file);
    expect(result.isImage).toBe(true);
  });
});

// ─── formatFileSize() ─────────────────────────────────────────────────────────

describe('formatFileSize()', () => {
  it('formats bytes under 1 KB as "N B"', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(1023)).toBe('1023 B');
  });

  it('formats values between 1 KB and 1 MB as "N.N KB"', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(512 * 1024)).toBe('512.0 KB');
  });

  it('formats values >= 1 MB as "N.N MB"', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe('5.5 MB');
  });

  it('formats zero bytes as "0 B"', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });
});

// ─── ACCEPTED_FILE_TYPES ──────────────────────────────────────────────────────

describe('ACCEPTED_FILE_TYPES constant', () => {
  it('is a non-empty string', () => {
    expect(typeof ACCEPTED_FILE_TYPES).toBe('string');
    expect(ACCEPTED_FILE_TYPES.length).toBeGreaterThan(0);
  });

  it('includes .pdf', () => {
    expect(ACCEPTED_FILE_TYPES).toContain('.pdf');
  });

  it('includes .docx', () => {
    expect(ACCEPTED_FILE_TYPES).toContain('.docx');
  });

  it('includes image extensions', () => {
    expect(ACCEPTED_FILE_TYPES).toContain('.png');
    expect(ACCEPTED_FILE_TYPES).toContain('.jpg');
  });
});
