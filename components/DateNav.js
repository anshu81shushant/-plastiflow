'use client';

import { useRouter } from 'next/navigation';
import { formatDateLong } from '@/lib/machines';

function shiftDate(dateStr, delta) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default function DateNav({ basePath, date }) {
  const router = useRouter();

  const goTo = (newDate) => router.push(`${basePath}?date=${newDate}`);

  return (
    <div className="date-nav">
      <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => goTo(shiftDate(date, -1))}>←</button>
      <input
        type="date"
        className="input"
        style={{ width: 170 }}
        value={date}
        onChange={(e) => e.target.value && goTo(e.target.value)}
      />
      <button className="btn btn-secondary" style={{ padding: '8px 12px' }} onClick={() => goTo(shiftDate(date, 1))}>→</button>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{formatDateLong(date)}</span>
    </div>
  );
}
