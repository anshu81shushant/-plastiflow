'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { ALL_HOURS, hourLabel, totals, efficiencyPct, rejectRatePct, effColor } from '@/lib/machines';

function emptyRow() {
  return { id: null, quantity: '', rejected_qty: '', downtime_minutes: '', operator_name: '', notes: '', dirty: false, saving: false };
}

export default function MachineHourlyGrid({ machine, logDate, initialLogs }) {
  const router = useRouter();
  const [rows, setRows] = useState(() => {
    const map = {};
    for (const h of ALL_HOURS) map[h] = emptyRow();
    for (const log of initialLogs) {
      map[log.hour_slot] = {
        id: log.id,
        quantity: String(log.quantity ?? ''),
        rejected_qty: String(log.rejected_qty ?? ''),
        downtime_minutes: String(log.downtime_minutes ?? ''),
        operator_name: log.operator_name || '',
        notes: log.notes || '',
        dirty: false,
        saving: false,
      };
    }
    return map;
  });
  const [error, setError] = useState('');

  const loggedLogs = useMemo(
    () => ALL_HOURS.filter((h) => rows[h].id !== null || rows[h].quantity !== '').map((h) => ({
      quantity: Number(rows[h].quantity) || 0,
      rejected_qty: Number(rows[h].rejected_qty) || 0,
      downtime_minutes: Number(rows[h].downtime_minutes) || 0,
    })),
    [rows]
  );

  const t = totals(loggedLogs);
  const eff = efficiencyPct(t.quantity, t.hoursLogged, machine.capacity_per_hour);
  const rejectRate = rejectRatePct(t.quantity, t.rejected);
  const maxQty = Math.max(1, ...ALL_HOURS.map((h) => Number(rows[h].quantity) || 0));

  const update = (hour, field, value) => {
    setRows((prev) => ({ ...prev, [hour]: { ...prev[hour], [field]: value, dirty: true } }));
  };

  const saveRow = async (hour) => {
    const row = rows[hour];
    const qty = Number(row.quantity) || 0;
    const rej = Number(row.rejected_qty) || 0;
    const down = Number(row.downtime_minutes) || 0;

    if (qty === 0 && rej === 0 && down === 0 && !row.operator_name && !row.notes) {
      setError(`Enter at least a quantity, reject count, or downtime for ${hourLabel(hour)}.`);
      return;
    }

    setRows((prev) => ({ ...prev, [hour]: { ...prev[hour], saving: true } }));
    setError('');
    const supabase = createClient();

    try {
      const payload = {
        machine_id: machine.id,
        log_date: logDate,
        hour_slot: hour,
        quantity: qty,
        rejected_qty: rej,
        downtime_minutes: down,
        operator_name: row.operator_name.trim() || null,
        notes: row.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error: upsertError } = await supabase
        .from('machine_hourly_logs')
        .upsert(payload, { onConflict: 'machine_id,log_date,hour_slot' })
        .select()
        .single();
      if (upsertError) throw upsertError;

      setRows((prev) => ({ ...prev, [hour]: { ...prev[hour], id: data.id, dirty: false, saving: false } }));
      router.refresh();
    } catch (err) {
      setError('Could not save that entry. Try again.');
      setRows((prev) => ({ ...prev, [hour]: { ...prev[hour], saving: false } }));
    }
  };

  const clearRow = async (hour) => {
    const row = rows[hour];
    if (!row.id) {
      setRows((prev) => ({ ...prev, [hour]: emptyRow() }));
      return;
    }
    if (!confirm(`Clear the ${hourLabel(hour)} entry for ${machine.name}?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('machine_hourly_logs').delete().eq('id', row.id);
    if (deleteError) { alert('Could not delete entry. Try again.'); return; }
    setRows((prev) => ({ ...prev, [hour]: emptyRow() }));
    router.refresh();
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 18 }}>
        <StatBlock label="Total produced" value={t.quantity.toLocaleString()} />
        <StatBlock label="Rejected" value={t.rejected.toLocaleString()} sub={`${rejectRate.toFixed(1)}%`} />
        <StatBlock label="Downtime" value={`${Math.floor(t.downtimeMin / 60)}h ${t.downtimeMin % 60}m`} />
        <StatBlock label="Hours logged" value={`${t.hoursLogged} / 24`} />
        <StatBlock
          label="Efficiency"
          value={eff === null ? '—' : `${eff.toFixed(0)}%`}
          color={effColor(eff)}
          sub={machine.capacity_per_hour ? `vs ${machine.capacity_per_hour}/hr target` : 'set a target capacity'}
        />
      </div>

      {/* Hourly bar chart */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 70, marginBottom: 20, padding: '0 2px' }}>
        {ALL_HOURS.map((h) => {
          const qty = Number(rows[h].quantity) || 0;
          const heightPct = qty > 0 ? Math.max(6, (qty / maxQty) * 100) : 2;
          return (
            <div key={h} title={`${hourLabel(h)}: ${qty} units`} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' }}>
              <div style={{
                width: '100%',
                height: `${heightPct}%`,
                background: qty > 0 ? 'var(--accent)' : 'var(--gray-bg)',
                borderRadius: '3px 3px 0 0',
              }} />
            </div>
          );
        })}
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

      <div style={{ overflowX: 'auto' }}>
        <table className="hourly-table">
          <thead>
            <tr>
              <th>Hour</th>
              <th>Units good</th>
              <th>Rejects</th>
              <th>Downtime (min)</th>
              <th>Operator</th>
              <th>Notes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {ALL_HOURS.map((h) => {
              const row = rows[h];
              const hasData = row.id !== null;
              return (
                <tr key={h} style={hasData ? undefined : { opacity: 0.75 }}>
                  <td style={{ fontWeight: 700, fontSize: 12.5, whiteSpace: 'nowrap' }}>{hourLabel(h)}</td>
                  <td>
                    <input className="input hourly-input" type="number" min="0" value={row.quantity}
                      onChange={(e) => update(h, 'quantity', e.target.value)} placeholder="0" />
                  </td>
                  <td>
                    <input className="input hourly-input" type="number" min="0" value={row.rejected_qty}
                      onChange={(e) => update(h, 'rejected_qty', e.target.value)} placeholder="0" />
                  </td>
                  <td>
                    <input className="input hourly-input" type="number" min="0" value={row.downtime_minutes}
                      onChange={(e) => update(h, 'downtime_minutes', e.target.value)} placeholder="0" />
                  </td>
                  <td>
                    <input className="input hourly-input" style={{ width: 110 }} value={row.operator_name}
                      onChange={(e) => update(h, 'operator_name', e.target.value)} placeholder="—" />
                  </td>
                  <td>
                    <input className="input hourly-input" style={{ width: 140 }} value={row.notes}
                      onChange={(e) => update(h, 'notes', e.target.value)} placeholder="—" />
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="link-btn" disabled={!row.dirty || row.saving} onClick={() => saveRow(h)}>
                      {row.saving ? 'Saving…' : 'Save'}
                    </button>
                    {hasData && <button className="link-btn danger" style={{ marginLeft: 10 }} onClick={() => clearRow(h)}>Clear</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub, color }) {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color || 'var(--text-primary)', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{sub}</div>}
    </div>
  );
}
