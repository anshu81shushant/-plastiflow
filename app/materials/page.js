import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase-server';
import { materialProjection, materialHistoricalForecast } from '@/lib/orders';
import MaterialActions from '@/components/MaterialActions';

export const dynamic = 'force-dynamic';

export default async function MaterialsPage() {
  const supabase = createClient();

  const [{ data: materials }, { data: activeOrders }, { data: allOrders }, { data: productionLogs }] = await Promise.all([
    supabase.from('raw_materials').select('*').order('name', { ascending: true }),
    supabase.from('orders').select('*').neq('status', 'Completed').not('material_id', 'is', null),
    supabase.from('orders').select('id, material_id, material_grams_per_unit').not('material_id', 'is', null),
    supabase.from('production_logs').select('order_id, log_date, quantity').order('log_date', { ascending: false }).limit(1000),
  ]);

  const list = materials || [];
  const orders = activeOrders || [];
  const ordersById = new Map((allOrders || []).map((o) => [o.id, o]));

  // Join production logs to their order's material + grams-per-unit, so we can
  // compute real kg consumed historically, not just what's currently committed.
  const logsWithMaterial = (productionLogs || [])
    .map((log) => {
      const order = ordersById.get(log.order_id);
      if (!order || !order.material_id || !order.material_grams_per_unit) return null;
      return {
        material_id: order.material_id,
        log_date: log.log_date,
        consumedKg: (order.material_grams_per_unit * log.quantity) / 1000,
      };
    })
    .filter(Boolean);

  const rows = list.map((m) => {
    const relevantOrders = orders.filter((o) => o.material_id === m.id);
    const projection = materialProjection(m, relevantOrders);
    const relevantLogs = logsWithMaterial.filter((l) => l.material_id === m.id);
    const forecast = materialHistoricalForecast(m, relevantLogs, 30);

    // Use whichever signal is more urgent — a material with no active orders but a real
    // historical burn rate showing <10 days left is just as worth flagging as one that's
    // already below its manual reorder threshold.
    let status = projection.status;
    if (forecast.hasHistory && forecast.daysUntilEmpty !== null && forecast.daysUntilEmpty <= 10 && status === 'ok') {
      status = 'low';
    }

    return { material: m, orderCount: relevantOrders.length, ...projection, status, forecast };
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
          {rows.map(({ material, committedKg, remainingAfterOrders, daysUntilEmpty, status, orderCount, forecast }) => (
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
                  <span>From active orders: <b style={{ color: daysUntilEmpty <= 7 ? 'var(--red-text)' : 'var(--text-primary)' }}>~{daysUntilEmpty}d</b></span>
                )}
              </div>

              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 13 }}>
                {forecast.hasHistory ? (
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Actual usage rate: <b style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{forecast.dailyBurnKg.toFixed(2)} kg/day</b>
                      <span style={{ color: 'var(--text-muted)' }}> (last {forecast.daysSpan}d)</span>
                    </span>
                    {forecast.daysUntilEmpty !== null && (
                      <span style={{ color: 'var(--text-secondary)' }}>
                        At this rate, runs out in: <b style={{ color: forecast.daysUntilEmpty <= 10 ? 'var(--red-text)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>~{forecast.daysUntilEmpty}d</b>
                      </span>
                    )}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontSize: 12.5 }}>
                    No production history yet for this material — the usage forecast fills in once you log production against orders using it.
                  </span>
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
