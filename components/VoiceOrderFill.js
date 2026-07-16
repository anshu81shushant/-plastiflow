'use client';

import { useState, useRef, useEffect } from 'react';
import { parseVoiceTranscript } from '@/lib/VoiceParser';

export default function VoiceOrderFill({ onFilled, materialNames = [] }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };

    recognition.onerror = (event) => {
      setError(event.error === 'not-allowed' ? 'Microphone access denied. Allow it in your browser settings.' : 'Could not hear you clearly. Try again.');
      setListening(false);
    };

    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;
    setError('');
    setTranscript('');
    setListening(true);
    recognitionRef.current.start();
  };

  const stopAndProcess = () => {
    recognitionRef.current?.stop();
    setListening(false);

    if (!transcript.trim()) {
      setError('No speech captured. Try again.');
      return;
    }

    setError('');
    const fields = parseVoiceTranscript(transcript, materialNames);
    const gotAnything = Object.values(fields).some((v) => v !== null);

    if (!gotAnything) {
      setError('Could not pick out any fields. Try phrasing like "customer Rajesh Traders, item plastic hanger, quantity 5000, due date 20 July".');
      return;
    }

    onFilled(fields);
    setTranscript('');
  };

  if (!supported) return null;

  return (
    <div style={{ marginBottom: 20, padding: 16, background: 'var(--accent-light)', borderRadius: 10, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={listening ? stopAndProcess : startListening}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 16px',
            borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
            background: listening ? '#DC2626' : 'var(--accent)', color: '#fff',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
          </svg>
          {listening ? 'Stop & fill form' : 'Fill by voice'}
        </button>

        <span style={{ fontSize: 12.5, color: 'var(--accent-text)' }}>
          {listening
            ? 'Listening — speak in order, then tap Stop.'
            : 'Say it structured: "customer Rajesh Traders, item plastic hanger, quantity 5000, due date 20 July"'}
        </span>
      </div>

      {transcript && listening && (
        <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          &ldquo;{transcript}&rdquo;
        </div>
      )}

      {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  );
}
