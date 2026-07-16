'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AnalysisRangePicker({ from, to }) {
  const router = useRouter();
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);

  const apply = (e) => {
    e.preventDefault();
    router.push(`/machines/analysis?from=${f}&to=${t}`);
  };

  const preset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const fromStr = start.toISOString().slice(0, 10);
    const toStr = end.toISOString().slice(0, 10);
    setF(fromStr);
    setT(toStr);
    router.push(`/machines/analysis?from=${fromStr}&to=${toStr}`);
  };

  return (
    <form onSubmit={apply} className="date-nav" style={{ justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input type="date" className="input" style={{ width: 160 }} value={f} onChange={(e) => setF(e.target.value)} />
        <span style={{ color: 'var(--text-muted)' }}>to</span>
        <input type="date" className="input" style={{ width: 160 }} value={t} onChange={(e) => setT(e.target.value)} />
        <button type="submit" className="btn btn-primary" style={{ padding: '8px 14px' }}>Apply</button>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => preset(1)}>Today</button>
        <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => preset(7)}>7 days</button>
        <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => preset(30)}>30 days</button>
      </div>
    </form>
  );
}
