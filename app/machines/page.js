import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase-server';
import { machineStatusBadgeClass, totalUnitsFor } from '@/lib/machines';

export const dynamic = 'force-dynamic';

export default async function MachinesPage() {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: machines }, { data: todayLogs }, { data: openDowntime }] = await Promise.all([
    supabase.from('machines').select('*').order('name', { ascending: true }),
    supabase.from('machine_hourly_logs').select('*').eq('log_date', today),
    supabase.from('machine_downtime_logs').select('*').is('ended_at', null),
  ]);

  const list = machines || [];
  const logs = todayLogs || [];
  const downtime = openDowntime || [];

  const todayTotalByMachine = {};
  logs.forEach((l) => {
    const units = Number(l.units_produced) || 0;
    todayTotalByMachine[l.machine_id] = (todayTotalByMachine[l.machine_id] || 0) + units;
  });

  const downMachineIds = new Set(downtime.map((d) => d.machine_id));

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Machines</div>
          <div className="page-subtitle">{list.length} machines · today's output</div>
        </div>
        <Link href="/machines/new" className="btn btn-primary">+ Add machine</Link>
      </div>

      {list.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No machines yet</div>
          <div className="empty-state-sub">Add your injection moulding machines to start logging hourly production.</div>
          <Link href="/machines/new" className="btn btn-primary">+ Add machine</Link>
        </div>
      ) : (
        <div className="orders-list">
          {list.map((m) => {
            const todayTotal = todayTotalByMachine[m.id] || 0;
            const isDown = downMachineIds.has(m.id);
            return (
              <Link key={m.id} href={`/machines/${m.id}`} className="order-card" style={{ cursor: 'pointer' }}>
                <div className="order-avatar" style={{ background: isDown ? 'var(--red-bg)' : 'var(--gray-bg)', color: isDown ? 'var(--red-text)' : 'var(--text-secondary)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h6M7 16h4" />
                  </svg>
                </div>
                <div className="order-card-info">
                  <div className="order-card-title-row">
                    <span className="order-card-title">{m.name}</span>
                    <span className={machineStatusBadgeClass(isDown ? 'Down' : m.status)}>{isDown ? 'Down' : m.status}</span>
                  </div>
                  <div className="order-card-sub">
                    Today: <b style={{ color: 'var(--text-primary)' }}>{todayTotal.toLocaleString()}</b> units produced
                  </div>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
