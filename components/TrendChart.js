'use client';

export default function TrendChart({ data, title, subtitle }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="section-card">
      <div className="section-header">
        <div>
          <div className="section-title">{title}</div>
          {subtitle && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>

      {data.every((d) => d.value === 0) ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '30px 0' }}>
          No data yet — this fills in as you log activity.
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, paddingTop: 10 }}>
          {data.map((d, i) => {
            const heightPct = (d.value / max) * 100;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(heightPct, d.value > 0 ? 4 : 0)}%`,
                      background: d.value > 0 ? 'var(--accent)' : 'var(--gray-bg)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                      minHeight: d.value > 0 ? 3 : 0,
                    }}
                    title={`${d.label}: ${d.value}`}
                  />
                </div>
                <div style={{ fontSize: 9.5, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                  {d.value > 0 ? d.value : ''}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{d.label}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
