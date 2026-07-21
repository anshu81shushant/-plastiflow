import Link from 'next/link';

export default function AlertsPanel({ overdueOrders, lowStockMaterials, downMachines }) {
  const totalAlerts = overdueOrders.length + lowStockMaterials.length + downMachines.length;

  if (totalAlerts === 0) {
    return (
      <div className="section-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>All clear</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>No overdue orders, low stock, or machine downtime right now.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="section-card" style={{ borderColor: 'var(--red-dot)', borderWidth: 1.5 }}>
      <div className="section-header">
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red-dot)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9L2.7 18a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L13.7 3.9a1 1 0 0 0-1.7 0Z" />
          </svg>
          Needs attention ({totalAlerts})
        </div>
      </div>

      {overdueOrders.map((o) => (
        <div key={`order-${o.id}`} className="order-row">
          <div className="order-row-info">
            <div className="order-row-title">{o.item_name}</div>
            <div className="order-row-sub">{o.customer_name} · Overdue</div>
          </div>
          <Link href="/orders" className="pill" style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>Order</Link>
        </div>
      ))}

      {lowStockMaterials.map((m) => (
        <div key={`material-${m.id}`} className="order-row">
          <div className="order-row-info">
            <div className="order-row-title">{m.name}</div>
            <div className="order-row-sub">{m.stock_kg.toFixed(1)} kg left · below {m.reorder_threshold_kg} kg threshold</div>
          </div>
          <Link href="/materials" className="pill" style={{ background: 'var(--amber-bg)', color: 'var(--amber-text)' }}>Material</Link>
        </div>
      ))}

      {downMachines.map((m) => (
        <div key={`machine-${m.id}`} className="order-row">
          <div className="order-row-info">
            <div className="order-row-title">{m.name}</div>
            <div className="order-row-sub">Currently down</div>
          </div>
          <Link href={`/machines/${m.id}`} className="pill" style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>Machine</Link>
        </div>
      ))}
    </div>
  );
}
