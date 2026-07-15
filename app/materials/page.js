import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase-server';
import { materialProjection } from '@/lib/orders';
import MaterialActions from '@/components/MaterialActions';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const supabase = createClient();

  const [{ data: materials }, { data: activeOrders }] = await Promise.all([
    supabase.from('raw_materials').select('*').order('name', { ascending: true }),
    supabase.from('orders').select('*').neq('status', 'Completed').not('material_id', 'is', null),
  ]);

  const list = materials || [];
  const orders = activeOrders || [];

  const rows = list.map((m) => {
    const relevantOrders = orders.filter((o) => o.material_id === m.id);
    const projection = materialProjection(m, relevantOrders);
    return { material: m, orderCount: relevantOrders.length, ...projection };
  });

  const lowCount = rows.filter((r) => r.status !== 'ok').length;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Raw materials</div>
          <div className="page-subtitle">
            {list.length} materials tracked{lowCount > 0 ? ` · ${lowCount} need attention` : ''}
          </div>
        </div>
        <Link href="/materials/new" className="btn btn-primary">+ Add material</Link>
      </div>

      {rows.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No materials yet</div>
          <div className="empty-state-sub">Add your granule stock to start tracking reorder alerts.</div>
          <Link href="/materials/new" className="btn btn-primary">+ Add material</Link>
        </div>
      ) : (
        <div className="orders-list">
          {rows.map(({ material, committedKg, remainingAfterOrders, daysUntilEmpty, status, orderCount }) => (
            <div key={material.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15.5 }}>
                    {material.name}{material.color ? ` — ${material.color}` : ''}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 3 }}>
                    {material.stock_kg.toLocaleString()} kg in stock
                    {material.supplier_name ? ` · Supplier: ${material.supplier_name}` : ''}
                  </div>
                </div>
                <span
                  className="badge"
                  style={{
                    background: status === 'critical' ? 'var(--red-bg)' : status === 'low' ? 'var(--amber-bg)' : 'var(--green-bg)',
                    color: status === 'critical' ? 'var(--red-text)' : status === 'low' ? 'var(--amber-text)' : 'var(--green-text)',
                  }}
                >
                  {status === 'critical' ? 'Critical — order now' : status === 'low' ? 'Low stock' : 'Stock ok'}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                <span>Committed to {orderCount} active order{orderCount === 1 ? '' : 's'}: <b style={{ color: 'var(--text-primary)' }}>{committedKg.toFixed(1)} kg</b></span>
                <span>Projected remaining: <b style={{ color: remainingAfterOrders < 0 ? 'var(--red-text)' : 'var(--text-primary)' }}>{remainingAfterOrders.toFixed(1)} kg</b></span>
                {daysUntilEmpty !== null && (
                  <span>Runs out in: <b style={{ color: daysUntilEmpty <= 7 ? 'var(--red-text)' : 'var(--text-primary)' }}>~{daysUntilEmpty} days</b></span>
                )}
              </div>

              <MaterialActions material={material} />
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
