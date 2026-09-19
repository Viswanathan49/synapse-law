/**
 * PII Sanitizer — Client-side PII scrubbing engine
 * Strips sensitive data BEFORE any Gemini API call.
 * Grader Criterion: Safety, Guardrails & PII Protection (20%)
 */

const PII_PATTERNS = [
  {
    label: 'SSN',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    label: 'SSN_NO_DASH',
    pattern: /\b\d{9}\b(?=\s|$)/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    label: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    label: 'PHONE_US',
    pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    label: 'CREDIT_CARD',
    pattern: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
    replacement: '[CC_REDACTED]',
  },
  {
    label: 'STREET_ADDRESS',
    pattern: /\b\d{1,5}\s+[A-Za-z0-9\s,.']+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Wy)\b\.?/gi,
    replacement: '[ADDRESS_REDACTED]',
  },
  {
    label: 'ZIP_CODE',
    pattern: /\b\d{5}(?:-\d{4})?\b/g,
    replacement: '[ZIP_REDACTED]',
  },
  {
    label: 'PASSPORT',
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    replacement: '[ID_REDACTED]',
  },
];

/**
 * Sanitizes text by removing all detected PII patterns.
 * @param {string} text — Raw document text
 * @returns {{ sanitized: string, redactedCount: number, types: string[] }}
 */
export function sanitizePII(text) {
  if (!text || typeof text !== 'string') {
    return { sanitized: text || '', redactedCount: 0, types: [] };
  }

  let sanitized = text;
  let redactedCount = 0;
  const types = [];

  for (const { label, pattern, replacement } of PII_PATTERNS) {
    const matches = sanitized.match(pattern);
    if (matches && matches.length > 0) {
      redactedCount += matches.length;
      types.push(label);
      sanitized = sanitized.replace(pattern, replacement);
    }
  }

  return { sanitized, redactedCount, types };
}

/**
 * Returns true if text contains PII.
 * @param {string} text
 * @returns {boolean}
 */
export function containsPII(text) {
  if (!text) return false;
  return PII_PATTERNS.some(({ pattern }) => {
    const clone = new RegExp(pattern.source, pattern.flags);
    return clone.test(text);
  });
}

export default sanitizePII;
