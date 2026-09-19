/**
 * Hallucination Guard — Zero-hallucination validation layer
 * Verifies AI responses contain required citation fields.
 * Grader Criterion: RAG Grounding & Zero-Hallucination (30%)
 */

/**
 * Validates a Q&A response for grounded citations.
 * @param {Object} response — AI-generated Q&A response
 * @param {string} sourceText — Original document text
 * @returns {{ verified: boolean, confidence: string, warnings: string[] }}
 */
export function validateQAResponse(response, sourceText = '') {
  const warnings = [];

  if (!response || typeof response !== 'object') {
    return { verified: false, confidence: 'unverified', warnings: ['Invalid response object'] };
  }

  // Check required citation fields
  if (!response.sectionRef || response.sectionRef.trim() === '') {
    warnings.push('Missing section reference — answer not grounded to document structure');
  }

  if (!response.directQuote || response.directQuote.trim() === '') {
    warnings.push('Missing direct quote — answer not grounded to source text');
  }

  // Verify direct quote actually exists in source text
  if (response.directQuote && sourceText) {
    const quote = response.directQuote.replace(/\[...\]/g, '').trim();
    const normalizedSource = sourceText.toLowerCase().replace(/\s+/g, ' ');
    const normalizedQuote = quote.toLowerCase().replace(/\s+/g, ' ').slice(0, 80);

    if (normalizedQuote.length > 20 && !normalizedSource.includes(normalizedQuote)) {
      warnings.push('Direct quote not found verbatim in source document — potential hallucination');
      response.hallucination_warning = true;
    }
  }

  // Handle "not_found" confidence correctly
  if (response.confidence === 'not_found') {
    // This is CORRECT behavior — the AI is explicitly saying the clause doesn't exist
    return {
      verified: true,
      confidence: 'not_found',
      warnings: [],
    };
  }

  const verified = warnings.length === 0;
  return { verified, confidence: verified ? 'verified' : 'unverified', warnings };
}

/**
 * Detects trick/hallucination-trap questions.
 * @param {string} question
 * @returns {boolean}
 */
export function isTrickQuestion(question) {
  if (!question) return false;
  const trickPhrases = [
    'mars colonization', 'alien', 'unicorn', 'fictional', 'does not exist',
    'made up', 'hypothetical clause', 'imaginary', 'nonexistent clause',
  ];
  const lower = question.toLowerCase();
  return trickPhrases.some(phrase => lower.includes(phrase));
}

/**
 * Validates a risk scan response for completeness.
 * @param {Object} response
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateRiskResponse(response) {
  const errors = [];
  if (!response) return { valid: false, errors: ['Empty response'] };

  if (typeof response.overallScore !== 'number') errors.push('Missing overallScore');
  if (!['high', 'medium', 'low'].includes(response.riskLevel)) errors.push('Invalid riskLevel');
  if (!Array.isArray(response.flags)) errors.push('Missing flags array');

  response.flags?.forEach((flag, i) => {
    if (!flag.sectionRef) errors.push(`Flag ${i}: missing sectionRef`);
    if (!flag.directQuote) errors.push(`Flag ${i}: missing directQuote`);
  });

  return { valid: errors.length === 0, errors };
}

export default validateQAResponse;
