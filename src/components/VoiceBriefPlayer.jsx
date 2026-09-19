import React, { useState, useEffect } from 'react';
import './VoiceBriefPlayer.css';

function VoiceBriefPlayer({ summaryText, topRisks = [] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setSpeechSupported(false);
    }
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function getSpeechText() {
    let script = summaryText || 'Legal document analysis complete.';
    if (topRisks && topRisks.length > 0) {
      script += ' Key risk flags identified: ';
      topRisks.forEach((r, idx) => {
        script += `Risk ${idx + 1}: ${r.type || r.clauseTitle || 'Clause flag'}, section ${r.sectionRef || 'specified'}. ${r.explanation || r.riskExplanation || ''}. `;
      });
    }
    script += ' This concludes the executive voice brief. Remember: not professional legal advice.';
    return script;
  }

  function handlePlay() {
    if (!speechSupported) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(getSpeechText());
    utterance.rate = rate;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  }

  function handlePause() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    }
  }

  function handleStop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }

  function handleRateChange(newRate) {
    setRate(newRate);
    if (isPlaying) {
      handleStop();
    }
  }

  if (!speechSupported) return null;

  return (
    <div className="voice-player-card glass-card">
      <div className="voice-player-inner">
        <div className="voice-info">
          <div className="voice-icon-wrap">
            <span className="voice-icon">🎧</span>
            {isPlaying && <span className="voice-pulse-ring" />}
          </div>
          <div>
            <div className="voice-title">Executive AI Voice Briefing</div>
            <div className="voice-sub">Spoken audio summary of executive contract analysis & red flags</div>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="voice-controls">
          <div className="voice-rate-picker">
            {[1.0, 1.25, 1.5].map(r => (
              <button
                key={r}
                className={`voice-rate-btn ${rate === r ? 'active' : ''}`}
                onClick={() => handleRateChange(r)}
                aria-label={`Set playback speed to ${r}x`}
              >
                {r}x
              </button>
            ))}
          </div>

          {!isPlaying ? (
            <button
              className="btn btn-primary btn-sm voice-btn-play"
              onClick={handlePlay}
              aria-label="Play Spoken AI Briefing"
            >
              ▶ {isPaused ? 'Resume' : 'Play Briefing'}
            </button>
          ) : (
            <button
              className="btn btn-secondary btn-sm"
              onClick={handlePause}
              aria-label="Pause Briefing"
            >
              ⏸ Pause
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleStop}
              aria-label="Stop Briefing"
              style={{ color: 'var(--risk-crimson)' }}
            >
              ⏹ Stop
            </button>
          )}
        </div>
      </div>

      {/* Animated Waveform Visualizer */}
      {isPlaying && (
        <div className="voice-waveform">
          <span className="wave-bar" style={{ animationDelay: '0s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.15s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.3s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.45s' }} />
          <span className="wave-bar" style={{ animationDelay: '0.2s' }} />
        </div>
      )}
    </div>
  );
}

export default VoiceBriefPlayer;
