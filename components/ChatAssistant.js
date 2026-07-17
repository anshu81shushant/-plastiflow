'use client';

import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  'Which orders are overdue?',
  'Any materials running low?',
  'What\u2019s due this week?',
  'Which machines are down?',
];

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextMessages = [...messages, { role: 'user', content: trimmed }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.error || 'Something went wrong.', error: true }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Could not reach the assistant — check your connection and try again.', error: true }]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="AI assistant">
          <div className="chat-header">
            <div className="chat-header-title">
              <div className="chat-header-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v1H8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1v5l3-3h5a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1V5a3 3 0 0 0-3-3Z" />
                </svg>
              </div>
              Ask PlastiFlow
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="chat-empty">
                <div className="chat-empty-title">Ask about your orders, stock or machines</div>
                <div className="chat-empty-sub">Answers come straight from your live PlastiFlow data.</div>
                <div className="chat-suggestions">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="chat-suggestion-chip" onClick={() => sendMessage(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}${m.error ? ' error' : ''}`}>
                {m.content}
              </div>
            ))}

            {loading && (
              <div className="chat-typing"><span /><span /><span /></div>
            )}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask something..."
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button type="submit" className="chat-send" disabled={loading || !input.trim()} aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button className="chat-fab" onClick={() => setOpen((v) => !v)} aria-label="Open AI assistant">
        {!open && <span className="chat-fab-dot" />}
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v1H8a3 3 0 0 0-3 3v2a3 3 0 0 0 3 3h1v5l3-3h5a3 3 0 0 0 3-3V9a3 3 0 0 0-3-3h-1V5a3 3 0 0 0-3-3Z" />
          </svg>
        )}
      </button>
    </>
  );
}
