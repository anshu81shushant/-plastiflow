'use client';

import { useState } from 'react';
import AppShell from '@/components/AppShell';
import DocumentScanner from '@/components/DocumentScanner';

export default function ScanDemoPage() {
  const [mode, setMode] = useState('po');

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Scan to fill (demo)</div>
          <div className="page-subtitle">Upload a real PO or bill and see what gets extracted automatically</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <button
          className={mode === 'po' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setMode('po')}
        >
          Scan a PO
        </button>
        <button
          className={mode === 'bill' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setMode('bill')}
        >
          Scan a bill
        </button>
      </div>

      <DocumentScanner docType={mode} materialNames={['HDPE Granules', 'Masterbatch Blue', 'PP Granules']} />

      <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--text-muted)' }}>
        This is a demo page — once confirmed working, the same scanner gets built into the real Add Order and Add Material forms so extracted fields drop straight into the form instead of just showing here.
      </div>
    </AppShell>
  );
}
