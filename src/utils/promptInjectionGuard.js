/**
 * Prompt Injection Guard — OWASP Top 10 for LLM Applications (LLM01) Defense
 *
 * Scans legal documents and user prompts for adversarial attacks, jailbreaks,
 * delimiter escaping, and hidden steganographic payload characters before
 * prompts reach Google Gemini or the local analysis engine.
 */

// ─── Adversarial Attack Patterns ──────────────────────────────────────────────

const INJECTION_PATTERNS = [
  {
    category: 'INSTRUCTION_OVERRIDE',
    severity: 'critical',
    pattern: /\b(?:ignore|disregard|forget|bypass|override)\s+(?:all\s+)?(?:previous|prior|above|existing)\s+(?:instructions|prompts|rules|commands|directions)\b/gi,
    description: 'Attempt to override system prompt instructions',
  },
  {
    category: 'JAILBREAK_MODE',
    severity: 'critical',
    pattern: /\b(?:dan\s+mode|developer\s+mode|unrestricted\s+mode|jailbreak|jailbroken|do\s+anything\s+now)\b/gi,
    description: 'Known jailbreak persona activation attempt',
  },
  {
    category: 'ROLEPLAY_BYPASS',
    severity: 'high',
    pattern: /\b(?:you\s+are\s+no\s+longer|act\s+as\s+an?\s+unfiltered|pretend\s+you\s+have\s+no\s+(?:rules|ethics|guardrails))\b/gi,
    description: 'Adversarial roleplay escape technique',
  },
  {
    category: 'SYSTEM_PROMPT_LEAK',
    severity: 'high',
    pattern: /\b(?:repeat|print|display|reveal|output|show)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|system\s+message|base\s+instructions)\b/gi,
    description: 'System prompt exfiltration attempt',
  },
  {
    category: 'SECRET_EXFILTRATION',
    severity: 'critical',
    pattern: /\b(?:api[_\s-]?key|secret[_\s-]?token|gemini[_\s-]?key|environment\s+variable|env\b)/gi,
    description: 'API key or environment secret discovery attempt',
  },
  {
    category: 'DELIMITER_INJECTION',
    severity: 'medium',
    pattern: /(?:```(?:json|xml|html)?|"""|''')\s*(?:system|assistant|instruction|human):/gi,
    description: 'Markdown/JSON delimiter injection to fake role boundaries',
  },
];

// ─── Zero-width & invisible character steganography ──────────────────────────

const INVISIBLE_CHARS_REGEX = /[\u200B-\u200D\uFEFF\u2060\u00A0\u202A-\u202E]/g;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sanitizes input by stripping invisible characters and normalizing control tokens.
 * @param {string} text
 * @returns {string}
 */
export function sanitizeAdversarialText(text) {
  if (typeof text !== 'string') return '';
  // Strip hidden zero-width steganographic characters
  let clean = text.replace(INVISIBLE_CHARS_REGEX, ' ');
  // Normalize consecutive whitespace
  clean = clean.replace(/[ \t]+/g, ' ');
  return clean;
}

/**
 * Inspects a prompt or document for adversarial injection vectors.
 *
 * @param {string} text — The user prompt or legal document content
 * @returns {{
 *   isSafe: boolean,
 *   threats: Array<{ category: string, severity: string, description: string }>,
 *   riskScore: number,
 *   sanitized: string
 * }}
 */
export function detectPromptInjection(text) {
  if (!text || typeof text !== 'string') {
    return { isSafe: true, threats: [], riskScore: 0, sanitized: '' };
  }

  const sanitized = sanitizeAdversarialText(text);
  const threats = [];
  let riskScore = 0;

  for (const { category, severity, pattern, description } of INJECTION_PATTERNS) {
    // Reset regex index for global flags
    pattern.lastIndex = 0;
    if (pattern.test(sanitized)) {
      threats.push({ category, severity, description });
      riskScore += severity === 'critical' ? 40 : severity === 'high' ? 25 : 15;
    }
  }

  // Cap risk score between 0 and 100
  const normalizedScore = Math.min(100, riskScore);
  const isSafe = normalizedScore < 40;

  return {
    isSafe,
    threats,
    riskScore: normalizedScore,
    sanitized,
  };
}

/**
 * Validates document content before AI processing, returning clean text
 * or throwing a descriptive security warning if a critical attack is detected.
 *
 * @param {string} text
 * @param {boolean} [strictMode=false]
 * @returns {{ text: string, hasAdversarialPatterns: boolean, threats: string[] }}
 */
export function validateAndCleanLegalText(text, strictMode = false) {
  const result = detectPromptInjection(text);

  if (strictMode && !result.isSafe) {
    const criticalThreat = result.threats.find((t) => t.severity === 'critical');
    if (criticalThreat) {
      throw new Error(`Security Exception: Adversarial instruction detected (${criticalThreat.description}).`);
    }
  }

  return {
    text: result.sanitized,
    hasAdversarialPatterns: !result.isSafe,
    threats: result.threats.map((t) => t.category),
  };
}
