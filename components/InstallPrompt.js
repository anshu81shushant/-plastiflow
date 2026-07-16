'use client';

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('plastiflow-install-dismissed') === '1') {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem('plastiflow-install-dismissed', '1');
    setVisible(false);
    setDismissed(true);
  };

  if (!visible || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 'calc(var(--tabbar-h, 0px) + 16px)', left: 16, right: 16, maxWidth: 420, margin: '0 auto',
      background: '#1C2128', color: '#fff', borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12, zIndex: 150, boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    }}>
      <div style={{ flex: 1, fontSize: 13.5 }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>Install PlastiFlow</div>
        <div style={{ color: '#B4B8BE' }}>Add it to your home screen for quick access.</div>
      </div>
      <button onClick={install} style={{ background: '#EA580C', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Install
      </button>
      <button onClick={dismiss} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 16, cursor: 'pointer', padding: 4 }}>
        ✕
      </button>
    </div>
  );
}
