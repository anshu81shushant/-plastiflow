'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);

  useEffect(() => {
    // Supabase's reset link logs the user into a temporary recovery session
    // automatically via the URL hash — we just need to confirm it's present.
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setSessionValid(!!data.session);
      setReady(true);
    });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setLoading(true);
    setError('');
    const supabase = createClient();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError('Could not update your password. The reset link may have expired — request a new one.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  if (!ready) return null;

  if (!sessionValid) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-title">Reset link expired</div>
          <div className="login-sub">This password reset link is no longer valid. Request a new one from the sign-in page.</div>
          <a href="/forgot-password" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Request new link
          </a>
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
        <div className="login-title">Set a new password</div>
        <div className="login-sub">Choose a new password for your account.</div>

        <form onSubmit={submit} style={{ textAlign: 'left', display: 'grid', gap: 14 }}>
          <div className="form-field">
            <label className="form-label">New password</label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div className="form-field">
            <label className="form-label">Confirm new password</label>
            <input
              className="input"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              autoComplete="new-password"
            />
          </div>

          {error && <div className="error-banner">{error}</div>}

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', padding: '12px 0', justifyContent: 'center' }}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  );
}
