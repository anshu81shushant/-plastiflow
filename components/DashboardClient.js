'use client';

import { useState, useEffect } from 'react';
import StartupKit from './StartupKit';

export default function DashboardClient({ isEmpty, children }) {
  const [showKit, setShowKit] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== 'undefined' && localStorage.getItem('plastiflow-onboarding-done') === '1';
    setShowKit(isEmpty && !dismissed);
    setChecked(true);
  }, [isEmpty]);

  if (!checked) return <>{children}</>;

  return (
    <>
      {showKit && (
        <div style={{ marginBottom: 20 }}>
          <StartupKit onFinished={() => setShowKit(false)} />
        </div>
      )}
      {children}
    </>
  );
}
