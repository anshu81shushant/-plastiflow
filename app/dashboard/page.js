import Link from 'next/link';
import AppShell from '@/components/AppShell';
import DashboardClient from '@/components/DashboardClient';
import { createClient } from '@/lib/supabase-server';
import { statusBadgeClass, daysLeftLabel, initials } from '@/lib/orders';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('due_date', { ascending: true });

  const list = orders || [];
  const total = list.length;
  const pending = list.filter((o) => o.status === 'Pending').length;
  const inProgress = list.filter((o) => o.status === 'In Progress').length;
  const completed = list.filter((o) => o.status === 'Completed').length;
  const overdue = list.filter((o) => {
    if (o.status === 'Completed') return false;
    return o.due_date && new Date(o.due_date) < new Date(new Date().toDateString());
  }).length;

  const urgent = list
    .filter((o) => o.status !== 'Completed')
    .slice(0, 4);

  const recent = [...list]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  const stats = [
    { label: 'Total Orders', value: total, color: 'var(--gray-bg)', iconColor: 'var(--text-secondary)', icon: 'box' },
    { label: 'Pending', value: pending, color: 'var(--amber-bg)', iconColor: 'var(--amber-text)', icon: 'clock' },
    { label: 'In Progress', value: inProgress, color: 'var(--accent-light)', iconColor: 'var(--accent-text)', icon: 'trend' },
    { label: 'Completed', value: completed, color: 'var(--green-bg)', iconColor: 'var(--green-text)', icon: 'check' },
    { label: 'Overdue', value: overdue, color: 'var(--red-bg)', iconColor: 'var(--red-text)', icon: 'alert' },
  ];

  const icons = {
    box: <path d="M21 8L12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
    trend: <path d="M3 17l6-6 4 4 8-8M17 7h4v4" />,
    check: <><circle cx="12" cy="12" r="9" /><path d="M9 12l2 2 4-4" /></>,
    alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9L2.7 18a1 1 0 0 0 .9 1.5h16.8a1 1 0 0 0 .9-1.5L13.7 3.9a1 1 0 0 0-1.7 0Z" /></>,
  };

  return (
    <AppShell>
      <DashboardClient isEmpty={total === 0}>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Overview of your plastic moulding orders</div>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ New Order</Link>
      </div>

      <div className="stat-grid">
        {stats.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.color, color: s.iconColor }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icons[s.icon]}
              </svg>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Urgent Orders</div>
          <Link href="/orders" className="view-all-link">View All →</Link>
        </div>
        {urgent.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '10px 0' }}>No urgent orders right now.</div>
        ) : (
          urgent.map((o) => (
            <div key={o.id} className="order-row">
              <div className="order-row-info">
                <div className="order-row-title">{o.item_name}</div>
                <div className="order-row-sub">{o.customer_name} · Qty: {Number(o.quantity || 0).toLocaleString()}</div>
              </div>
              <div className="order-row-meta">
                <span className={statusBadgeClass(o.status)}>{o.status}</span>
                <span className="pill">{daysLeftLabel(o.due_date, o.status)}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="section-card">
        <div className="section-header">
          <div className="section-title">Recent Orders</div>
          <Link href="/orders" className="view-all-link">View All →</Link>
        </div>
        {recent.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '10px 0' }}>No orders yet.</div>
        ) : (
          recent.map((o) => (
            <div key={o.id} className="order-row">
              <div className="order-row-info">
                <div className="order-row-title">{o.item_name}</div>
                <div className="order-row-sub">{o.customer_name} · {o.due_date ? new Date(o.due_date).toLocaleDateString('en-IN') : '—'}</div>
              </div>
              <div className="order-row-meta">
                <span className={statusBadgeClass(o.status)}>{o.status}</span>
              </div>
            </div>
          ))
        )}
      </div>
      </DashboardClient>
    </AppShell>
  );
}
