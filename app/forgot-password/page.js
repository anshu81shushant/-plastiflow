'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Enter your email.'); return; }

    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    // Always show success, even if the email doesn't exist — this avoids
    // leaking which emails have accounts (a common security practice).
    if (resetError) {
      setError('Could not send reset email. Try again in a moment.');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-icon" style={{ background: 'var(--green-dot)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="login-title">Check your email</div>
          <div className="login-sub">
            If an account exists for <b>{email}</b>, we sent a link to reset your password. It may take a minute to arrive — check your spam folder too.
          </div>
          <Link href="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="login-title">Reset your password</div>
        <div className="login-sub">Enter your email and we'll send you a link to set a new password.</div>

        <form onSubmit={requestReset} style={{ textAlign: 'left', display: 'grid', gap: 14 }}>
          <div className="form-field">
            <label className="form-label">Email</label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px 0', justifyContent: 'center' }}>
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
          <Link href="/login" style={{ color: 'var(--accent)', fontWeight: 700 }}>← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
