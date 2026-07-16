import Link from 'next/link';
import AppShell from '@/components/AppShell';
import AnalysisRangePicker from '@/components/AnalysisRangePicker';
import { createClient } from '@/lib/supabase-server';
import {
  daysAgoStr, todayStr, dateRange, formatDateShort,
  efficiencyPct, rejectRatePct, effColor,
} from '@/lib/machines';

export const dynamic = 'force-dynamic';

function BarChart({ data, maxLabelWidth = 0, color = 'var(--accent)', height = 140, valueFmt = (v) => v.toLocaleString() }) {
  // data: [{ label, value }]
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: data.length > 20 ? 3 : 10, height, padding: '0 2px' }}>
      {data.map((d, i) => {
        const pct = d.value > 0 ? Math.max(4, (d.value / max) * 100) : 2;
        return (
          <div key={i} title={`${d.label}: ${valueFmt(d.value)}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', minWidth: 0 }}>
            {data.length <= 14 && (
              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 3 }}>{valueFmt(d.value)}</div>
            )}
            <div style={{ width: '100%', height: `${pct}%`, background: d.value > 0 ? color : 'var(--gray-bg)', borderRadius: '3px 3px 0 0', minHeight: 2 }} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
              {d.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default async function MachineAnalysisPage({ searchParams }) {
  const from = searchParams?.from || daysAgoStr(6);
  const to = searchParams?.to || todayStr();

  const supabase = createClient();
  const [{ data: machines }, { data: logs }] = await Promise.all([
    supabase.from('machines').select('*').order('code', { ascending: true }),
    supabase.from('machine_hourly_logs').select('*').gte('log_date', from).lte('log_date', to),
  ]);

  const machineList = machines || [];
  const logList = logs || [];
  const days = dateRange(from, to);

  // Per-machine rollup
  const perMachine = machineList.map((m) => {
    const mLogs = logList.filter((l) => l.machine_id === m.id);
    const quantity = mLogs.reduce((s, l) => s + (l.quantity || 0), 0);
    const rejected = mLogs.reduce((s, l) => s + (l.rejected_qty || 0), 0);
    const downtimeMin = mLogs.reduce((s, l) => s + (l.downtime_minutes || 0), 0);
    const hoursLogged = mLogs.length;
    const eff = efficiencyPct(quantity, hoursLogged, m.capacity_per_hour);
    const rejectRate = rejectRatePct(quantity, rejected);
    return { machine: m, quantity, rejected, downtimeMin, hoursLogged, eff, rejectRate };
  });

  const plantTotal = perMachine.reduce((s, r) => s + r.quantity, 0);
  const plantRejects = perMachine.reduce((s, r) => s + r.rejected, 0);
  const plantDowntimeMin = perMachine.reduce((s, r) => s + r.downtimeMin, 0);
  const plantHoursLogged = perMachine.reduce((s, r) => s + r.hoursLogged, 0);
  const effValues = perMachine.filter((r) => r.eff !== null);
  const plantAvgEff = effValues.length > 0 ? effValues.reduce((s, r) => s + r.eff, 0) / effValues.length : null;

  const ranked = [...perMachine].filter((r) => r.hoursLogged > 0).sort((a, b) => b.quantity - a.quantity);
  const topMachine = ranked[0] || null;
  const bottomMachine = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  // Daily trend (total qty across all machines per day)
  const dailyTotals = days.map((d) => ({
    label: formatDateShort(d),
    value: logList.filter((l) => l.log_date === d).reduce((s, l) => s + (l.quantity || 0), 0),
  }));

  // Hour-of-day pattern (sum across the whole range, all machines) — reveals peak/slow hours
  const hourlyPattern = Array.from({ length: 24 }, (_, h) => ({
    label: String(h).padStart(2, '0'),
    value: logList.filter((l) => l.hour_slot === h).reduce((s, l) => s + (l.quantity || 0), 0),
  }));

  // Machine comparison
  const machineComparison = perMachine.map((r) => ({ label: r.machine.code, value: r.quantity }));

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Production analysis</div>
          <div className="page-subtitle">{formatDateShort(from)} – {formatDateShort(to)} · all machines</div>
        </div>
        <Link href="/machines" className="btn btn-secondary">All machines</Link>
      </div>

      <AnalysisRangePicker from={from} to={to} />

      {machineList.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No machines yet</div>
          <div className="empty-state-sub">Add machines and log hourly production first, then come back here.</div>
          <Link href="/machines/new" className="btn btn-primary">+ Add machine</Link>
        </div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <div className="stat-value">{plantTotal.toLocaleString()}</div>
              <div className="stat-label">Total units produced</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{plantRejects.toLocaleString()}</div>
              <div className="stat-label">Total rejects ({rejectRatePct(plantTotal, plantRejects).toFixed(1)}%)</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{Math.floor(plantDowntimeMin / 60)}h {plantDowntimeMin % 60}m</div>
              <div className="stat-label">Total downtime</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: plantAvgEff !== null ? effColor(plantAvgEff) : undefined }}>
                {plantAvgEff !== null ? `${plantAvgEff.toFixed(0)}%` : '—'}
              </div>
              <div className="stat-label">Avg efficiency vs target</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{plantHoursLogged}</div>
              <div className="stat-label">Machine-hours logged</div>
            </div>
          </div>

          {(topMachine || bottomMachine) && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
              {topMachine && (
                <div className="card" style={{ flex: 1, minWidth: 220, borderLeft: '4px solid var(--green-dot)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Top performer</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>{topMachine.machine.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {topMachine.quantity.toLocaleString()} units {topMachine.eff !== null ? `· ${topMachine.eff.toFixed(0)}% efficiency` : ''}
                  </div>
                </div>
              )}
              {bottomMachine && (
                <div className="card" style={{ flex: 1, minWidth: 220, borderLeft: '4px solid var(--red-dot)' }}>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Needs attention</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 3 }}>{bottomMachine.machine.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {bottomMachine.quantity.toLocaleString()} units {bottomMachine.eff !== null ? `· ${bottomMachine.eff.toFixed(0)}% efficiency` : ''}
                    {bottomMachine.downtimeMin > 0 ? ` · ${bottomMachine.downtimeMin}m downtime` : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="section-card">
            <div className="section-header"><div className="section-title">Daily output trend</div></div>
            <BarChart data={dailyTotals} />
          </div>

          <div className="section-card">
            <div className="section-header"><div className="section-title">Output by machine</div></div>
            <BarChart data={machineComparison} color="var(--blue-dot)" />
          </div>

          <div className="section-card">
            <div className="section-header">
              <div className="section-title">Output by hour of day</div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Summed across all machines &amp; days in range</span>
            </div>
            <BarChart data={hourlyPattern} color="var(--amber-dot)" />
          </div>

          <div className="section-card">
            <div className="section-header"><div className="section-title">Machine breakdown</div></div>
            <div style={{ overflowX: 'auto' }}>
              <table className="hourly-table" style={{ minWidth: 640 }}>
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th>Units produced</th>
                    <th>Rejects</th>
                    <th>Reject %</th>
                    <th>Downtime</th>
                    <th>Hours logged</th>
                    <th>Avg / hr</th>
                    <th>Efficiency</th>
                  </tr>
                </thead>
                <tbody>
                  {perMachine.sort((a, b) => b.quantity - a.quantity).map((r) => (
                    <tr key={r.machine.id}>
                      <td>
                        <Link href={`/machines/${r.machine.id}`} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {r.machine.code} · {r.machine.name}
                        </Link>
                      </td>
                      <td>{r.quantity.toLocaleString()}</td>
                      <td>{r.rejected.toLocaleString()}</td>
                      <td>{r.rejectRate.toFixed(1)}%</td>
                      <td>{Math.floor(r.downtimeMin / 60)}h {r.downtimeMin % 60}m</td>
                      <td>{r.hoursLogged}</td>
                      <td>{r.hoursLogged > 0 ? (r.quantity / r.hoursLogged).toFixed(1) : '—'}</td>
                      <td style={{ color: effColor(r.eff), fontWeight: 700 }}>{r.eff === null ? '—' : `${r.eff.toFixed(0)}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}
