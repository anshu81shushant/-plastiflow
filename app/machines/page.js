import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { createClient } from '@/lib/supabase-server';
import { todayStr, totals, efficiencyPct, effColor } from '@/lib/machines';

export const dynamic = 'force-dynamic';

export default async function MachinesPage() {
  const supabase = createClient();
  const today = todayStr();

  const [{ data: machines }, { data: todayLogs }] = await Promise.all([
    supabase.from('machines').select('*').order('code', { ascending: true }),
    supabase.from('machine_hourly_logs').select('*').eq('log_date', today),
  ]);

  const machineList = machines || [];
  const logs = todayLogs || [];

  const rows = machineList.map((m) => {
    const machineLogs = logs.filter((l) => l.machine_id === m.id);
    const t = totals(machineLogs);
    const eff = efficiencyPct(t.quantity, t.hoursLogged, m.capacity_per_hour);
    return { machine: m, ...t, eff };
  });

  const plantTotal = rows.reduce((s, r) => s + r.quantity, 0);
  const plantRejects = rows.reduce((s, r) => s + r.rejected, 0);
  const runningCount = rows.filter((r) => r.hoursLogged > 0).length;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Machines</div>
          <div className="page-subtitle">
            {machineList.length} machines · {plantTotal.toLocaleString()} units today · {runningCount} logged so far
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/machines/analysis" className="btn btn-secondary">View analysis</Link>
          <Link href="/machines/new" className="btn btn-primary">+ Add machine</Link>
        </div>
      </div>

      {machineList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No machines yet</div>
          <div className="empty-state-sub">
            Run <code>supabase-migration-4-machines.sql</code> in Supabase's SQL editor to seed your 7 machines, or add one manually.
          </div>
          <Link href="/machines/new" className="btn btn-primary">+ Add machine</Link>
        </div>
      ) : (
        <div className="stat-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-value">{plantTotal.toLocaleString()}</div>
            <div className="stat-label">Units today (all machines)</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{plantRejects.toLocaleString()}</div>
            <div className="stat-label">Rejects today</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{runningCount}/{machineList.length}</div>
            <div className="stat-label">Machines with entries today</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {rows.map(({ machine, quantity, rejected, downtimeMin, hoursLogged, eff }) => (
          <Link key={machine.id} href={`/machines/${machine.id}`} className="machine-card" style={{ textDecoration: 'none' }}>
            <div className="machine-card-top">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="machine-code-pill">{machine.code}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>{machine.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {machine.capacity_per_hour ? `Target ${machine.capacity_per_hour}/hr` : 'No target set'}
                  </div>
                </div>
              </div>
              {!machine.active && <span className="badge" style={{ background: 'var(--gray-bg)', color: 'var(--gray-text)' }}>Inactive</span>}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span>Today: <b style={{ color: 'var(--text-primary)' }}>{quantity.toLocaleString()}</b> units</span>
              <span>{hoursLogged}/24 hrs logged</span>
            </div>

            <div className="mini-bar-track">
              <div
                className="mini-bar-fill"
                style={{
                  width: `${eff === null ? 0 : Math.min(100, eff)}%`,
                  background: effColor(eff),
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Efficiency: <b style={{ color: effColor(eff) }}>{eff === null ? '—' : `${eff.toFixed(0)}%`}</b></span>
              <span>Rejects: {rejected} · Downtime: {downtimeMin}m</span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
