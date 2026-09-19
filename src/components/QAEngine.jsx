import React, { useState } from 'react';
import { answerQuestion } from '../services/legalAiService.js';

const SUGGESTED_QUESTIONS = [
  'What is the termination notice period?',
  'Who is responsible for indemnification?',
  'Does this contract automatically renew?',
  'What are the payment terms and due dates?',
  'What is the governing law and jurisdiction?',
  'Are there any non-compete restrictions?',
  'What happens to intellectual property after termination?',
];

function ConfidenceBadge({ confidence }) {
  const map = {
    verified:    { class: 'confidence-verified',    icon: '✅', label: 'Verified' },
    unverified:  { class: 'confidence-unverified',  icon: '⚠️', label: 'Unverified' },
    not_found:   { class: 'confidence-not-found',   icon: '🔍', label: 'Not Found in Document' },
  };
  const config = map[confidence] || map.unverified;
  return (
    <span className={config.class} style={{ fontWeight: 600, fontSize: '0.875rem' }}>
      {config.icon} {config.label}
    </span>
  );
}

function QAEngine({ documentText }) {
  const [question, setQuestion] = useState('');
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleAsk(q = question) {
    if (!q.trim() || !documentText) return;
    setLoading(true);
    setError(null);
    const currentQ = q;
    try {
      const data = await answerQuestion(documentText, currentQ);
      setAnswers(prev => [{ question: currentQ, ...data, id: Date.now() }, ...prev]);
      setQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Input */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '16px' }}>💬 Grounded Q&A Engine</h3>
        <p style={{ fontSize: '0.8125rem', marginBottom: '14px' }}>
          Ask anything about your document. Every answer includes exact section references and direct quotes.
        </p>

        {/* Suggested questions */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {SUGGESTED_QUESTIONS.map((q, i) => (
            <button
              key={i}
              id={`qa-suggest-${i}`}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.75rem', border: '1px solid var(--border-default)' }}
              onClick={() => handleAsk(q)}
              disabled={loading || !documentText}
            >
              {q}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            id="qa-question-input"
            type="text"
            className="input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about this document..."
            disabled={loading || !documentText}
          />
          <button
            id="qa-submit-btn"
            className="btn btn-primary"
            onClick={() => handleAsk()}
            disabled={loading || !question.trim() || !documentText}
            style={{ flexShrink: 0 }}
          >
            {loading ? <span className="spinner" /> : '→ Ask'}
          </button>
        </div>
        {!documentText && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--risk-amber)', marginTop: '10px' }}>
            ⚠️ Load a document first to enable Q&A
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="disclaimer-banner" id="qa-disclaimer">
        <span className="disclaimer-icon">⚠️</span>
        Not Professional Legal Advice — For Informational Purposes Only
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '16px', borderColor: 'var(--risk-crimson)' }}>
          <p style={{ color: 'var(--risk-crimson)' }}>❌ {error}</p>
        </div>
      )}

      {loading && (
        <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="spinner" style={{ width: '24px', height: '24px' }} />
          <p style={{ color: 'var(--brand-primary)' }}>Searching document for grounded answer...</p>
        </div>
      )}

      {/* Answer History */}
      {answers.map(ans => (
        <div key={ans.id} className="glass-card animate-fadeInUp" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Question */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>❓</span>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{ans.question}</p>
          </div>

          <div className="divider" />

          {/* Hallucination Warning */}
          {ans.hallucination_warning && (
            <div style={{ padding: '10px 14px', background: 'var(--risk-crimson-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--risk-crimson)', display: 'flex', gap: '10px' }}>
              <span>🚫</span>
              <p style={{ fontSize: '0.8125rem', color: 'var(--risk-crimson)' }}>
                <strong>Hallucination Guard Alert:</strong> This answer could not be fully verified against the document. Treat with caution.
              </p>
            </div>
          )}

          {/* Answer */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>🤖</span>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7 }}>{ans.answer}</p>
          </div>

          {/* Citation Row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
            <ConfidenceBadge confidence={ans.confidence} />
            {ans.sectionRef && ans.sectionRef !== 'N/A' && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--brand-primary)', fontWeight: 600 }}>📍 {ans.sectionRef}</span>
            )}
            {ans.pageEstimate && ans.pageEstimate !== 'N/A' && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>📄 {ans.pageEstimate}</span>
            )}
          </div>

          {/* Direct Quote */}
          {ans.directQuote && ans.directQuote !== 'N/A' && (
            <blockquote className="quote-block">
              "{ans.directQuote}"
            </blockquote>
          )}

          {/* Related Clauses */}
          {ans.relatedClauses?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Related:</span>
              {ans.relatedClauses.map((c, i) => (
                <span key={i} style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'var(--glass-bg)', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default QAEngine;
