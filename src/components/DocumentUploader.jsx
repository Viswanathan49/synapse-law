import React, { useRef, useState } from 'react';
import { parseFile, ACCEPTED_FILE_TYPES, formatFileSize } from '../utils/fileParser.js';
import { sanitizePII } from '../utils/piiSanitizer.js';
import { getAllMockDocuments } from '../services/mockLegalData.js';
import { extractTextFromImage } from '../services/legalAiService.js';

/**
 * DocumentUploader — Multi-format document input component
 * Supports: PDF, DOCX, Images (via Gemini Vision), text paste, and pre-loaded docs
 */

/** Maximum allowed file size: 20 MB */
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

/** Maximum characters for direct text paste to prevent DoS */
const MAX_PASTE_CHARS = 500_000;

/** Allowed MIME types — explicit whitelist for security */
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/tiff',
  'image/gif',
]);

/** Allowed file extensions — enforced alongside MIME type */
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'tiff', 'gif']);

function DocumentUploader({ onDocumentLoad }) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const [piiInfo, setPiiInfo] = useState(null);
  const [pasteText, setPasteText] = useState('');
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'paste' | 'samples'
  const fileInputRef = useRef(null);
  const mockDocs = getAllMockDocuments();

  /**
   * Validates a file against size and type restrictions before parsing.
   * @param {File} file
   * @returns {string|null} Error message, or null if valid
   */
  function validateFile(file) {
    if (!file) return 'No file selected.';

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large (${formatFileSize(file.size)}). Maximum allowed size is 20 MB.`;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const mime = file.type.toLowerCase();

    if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(mime)) {
      return `Unsupported file type "${ext || file.type}". Please upload a PDF, DOCX, or image file.`;
    }

    return null;
  }

  async function processFile(file) {
    setError(null);
    setPiiInfo(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setLoadingMsg(`Parsing ${file.name}...`);

    try {
      const parsed = await parseFile(file);

      let text = '';
      let pageCount = parsed.pageCount || 1;
      const sourceType = parsed.sourceType;

      if (parsed.isImage) {
        setLoadingMsg('Extracting text from image via AI vision...');
        const result = await extractTextFromImage(parsed.base64, parsed.mimeType);
        text = result.text;
        pageCount = result.pageCount;
      } else {
        text = parsed.text;
      }

      setLoadingMsg('Scanning for PII...');
      const { sanitized, redactedCount, types } = sanitizePII(text);

      if (redactedCount > 0) {
        setPiiInfo({ redactedCount, types });
      }

      onDocumentLoad({
        text: sanitized,
        originalText: text,
        filename: file.name,
        pageCount,
        sourceType,
        fileSize: file.size,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
    e.target.value = '';
  }

  function handlePasteSubmit() {
    if (!pasteText.trim()) return;
    if (pasteText.length > MAX_PASTE_CHARS) {
      setError(`Pasted text exceeds the maximum of ${MAX_PASTE_CHARS.toLocaleString()} characters. Please trim your document.`);
      return;
    }
    const { sanitized, redactedCount, types } = sanitizePII(pasteText);
    if (redactedCount > 0) setPiiInfo({ redactedCount, types });

    onDocumentLoad({
      text: sanitized,
      originalText: pasteText,
      filename: 'Pasted Document',
      pageCount: Math.max(1, Math.ceil(pasteText.length / 3000)),
      sourceType: 'text',
      fileSize: new Blob([pasteText]).size,
    });
  }

  function handleMockDoc(doc) {
    setPiiInfo(null);
    onDocumentLoad({
      text: doc.text,
      originalText: doc.text,
      filename: doc.title,
      pageCount: Math.max(1, Math.ceil(doc.text.length / 3000)),
      sourceType: 'sample',
      fileSize: new Blob([doc.text]).size,
    });
  }

  const tabs = [
    { id: 'upload', label: '📁 Upload File' },
    { id: 'paste', label: '📋 Paste Text' },
    { id: 'samples', label: '⚡ Sample Docs' },
  ];

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '4px' }}>Load Legal Document</h3>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Supports PDF, DOCX, PNG, JPG, WEBP, TIFF — or paste text directly
        </p>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`doc-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="btn btn-ghost"
            style={{
              flex: 1, fontSize: '0.8125rem', padding: '8px',
              background: activeTab === tab.id ? 'var(--glass-bg)' : 'transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
              borderRadius: 'var(--radius-sm)',
              border: activeTab === tab.id ? '1px solid var(--glass-border)' : '1px solid transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upload Tab */}
      {activeTab === 'upload' && (
        <div
          id="doc-drop-zone"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--brand-primary)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--glass-bg)' : 'transparent',
            transition: 'all var(--transition-base)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            id="doc-file-input"
          />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div className="spinner" style={{ width: '32px', height: '32px' }} />
              <p style={{ color: 'var(--brand-primary)' }}>{loadingMsg}</p>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📄</div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '6px' }}>
                Drop your file here or click to browse
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                PDF • DOCX • PNG • JPG • WEBP • TIFF
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-disabled)', marginTop: '8px' }}>
                Images are analyzed via AI Vision — Max 20MB
              </p>
            </>
          )}
        </div>
      )}

      {/* Paste Tab */}
      {activeTab === 'paste' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <textarea
            id="doc-paste-input"
            className="textarea"
            placeholder="Paste your legal document text here..."
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            style={{ minHeight: '200px' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {pasteText.length.toLocaleString()} characters
            </span>
            <button
              id="doc-paste-submit"
              className="btn btn-primary"
              onClick={handlePasteSubmit}
              disabled={!pasteText.trim()}
            >
              Analyze Document →
            </button>
          </div>
        </div>
      )}

      {/* Samples Tab */}
      {activeTab === 'samples' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            Pre-loaded benchmark documents for instant analysis
          </p>
          {mockDocs.map(doc => (
            <button
              key={doc.id}
              id={`sample-doc-${doc.id}`}
              className="btn btn-secondary"
              onClick={() => handleMockDoc(doc)}
              style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '14px 16px', height: 'auto' }}
            >
              <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{doc.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{doc.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{doc.description}</div>
              </div>
              <span className={`badge badge-${doc.riskLevel === 'high' ? 'crimson' : doc.riskLevel === 'medium' ? 'amber' : 'emerald'}`} style={{ flexShrink: 0 }}>
                {doc.riskLevel}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* PII Redaction Notice */}
      {piiInfo && (
        <div className="disclaimer-banner" style={{ marginTop: '12px', borderColor: 'hsla(217,91%,60%,0.3)', color: 'var(--brand-primary)', background: 'hsla(217,91%,60%,0.08)' }}>
          <span className="disclaimer-icon">🛡️</span>
          <span>
            <strong>{piiInfo.redactedCount} PII item{piiInfo.redactedCount !== 1 ? 's' : ''} automatically redacted</strong>
            {' '}before AI analysis ({piiInfo.types.join(', ')})
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="disclaimer-banner" style={{ marginTop: '12px', borderColor: 'var(--risk-crimson)', color: 'var(--risk-crimson)', background: 'var(--risk-crimson-bg)' }}>
          <span className="disclaimer-icon">❌</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default DocumentUploader;
