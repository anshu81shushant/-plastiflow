import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase-server';
import { statusBadgeClass, daysLeftLabel, formatDate, progressPct } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export default async function RemainingPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .neq('status', 'Completed')
    .order('due_date', { ascending: true });

  const list = orders || [];

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Remaining Orders</div>
          <div className="page-subtitle">{list.length} orders pending completion</div>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ New Order</Link>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">All caught up</div>
          <div className="empty-state-sub">No orders are pending completion right now.</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.03em', marginBottom: 10 }}>
            UPCOMING ({list.length})
          </div>
          <div className="orders-list">
            {list.map((o) => (
              <div key={o.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 15, marginRight: 10 }}>{o.item_name}</span>
                    <span className={statusBadgeClass(o.status)}>{o.status}</span>
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                  {o.customer_name} · Qty: {Number(o.quantity || 0).toLocaleString()} · Due: {formatDate(o.due_date)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginTop: 14 }}>
                  <span>Progress</span>
                  <span>{daysLeftLabel(o.due_date, o.status)}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPct(o.days_to_complete, o.due_date)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
