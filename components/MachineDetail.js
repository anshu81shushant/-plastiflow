'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  MACHINE_STATUSES, machineStatusBadgeClass, formatHourSlot,
  dailyTotals, totalDowntimeMinutes, formatMinutes, lastNDates,
} from '@/lib/machines';

function currentHourSlot() {
  return new Date().getHours();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function MachineDetail({ machine, initialHourlyLogs, initialDowntimeLogs, orders }) {
  const router = useRouter();
  const [hourlyLogs, setHourlyLogs] = useState(initialHourlyLogs);
  const [downtimeLogs, setDowntimeLogs] = useState(initialDowntimeLogs);
  const [status, setStatus] = useState(machine.status);

  // Hourly entry form
  const [logDate, setLogDate] = useState(todayStr());
  const [hourSlot, setHourSlot] = useState(currentHourSlot());
  const [units, setUnits] = useState('');
  const [orderId, setOrderId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Downtime form
  const [showDowntimeForm, setShowDowntimeForm] = useState(false);
  const [downtimeReason, setDowntimeReason] = useState('');
  const [savingDowntime, setSavingDowntime] = useState(false);

  const ongoingDowntime = downtimeLogs.find((d) => !d.ended_at);

  const changeStatus = async (newStatus) => {
    setStatus(newStatus);
    const supabase = createClient();
    await supabase.from('machines').update({ status: newStatus }).eq('id', machine.id);
    router.refresh();
  };

  const logHour = async (e) => {
    e.preventDefault();
    const qty = Number(units);
    if (!qty || qty <= 0) { setError('Enter units produced.'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    try {
      const { data: newLog, error: insertError } = await supabase
        .from('machine_hourly_logs')
        .insert({
          machine_id: machine.id,
          order_id: orderId || null,
          log_date: logDate,
          hour_slot: hourSlot,
          units_produced: qty,
        })
        .select()
        .single();
      if (insertError) throw insertError;

      setHourlyLogs((prev) => [newLog, ...prev]);
      setUnits('');
      router.refresh();
    } catch (err) {
      setError(`Could not save entry: ${err?.message || 'unknown error'}. Check the browser console for details.`);
      console.error('machine_hourly_logs insert error:', err);
    }
    setSaving(false);
  };

  const deleteHourLog = async (log) => {
    if (!confirm(`Delete this entry (${log.units_produced} units)?`)) return;
    const supabase = createClient();
    await supabase.from('machine_hourly_logs').delete().eq('id', log.id);
    setHourlyLogs((prev) => prev.filter((l) => l.id !== log.id));
    router.refresh();
  };

  const startDowntime = async (e) => {
    e.preventDefault();
    if (!downtimeReason.trim()) { setError('Enter a reason for downtime.'); return; }

    setSavingDowntime(true);
    setError('');
    const supabase = createClient();

    try {
      const { data: newDowntime, error: insertError } = await supabase
        .from('machine_downtime_logs')
        .insert({ machine_id: machine.id, reason: downtimeReason.trim() })
        .select()
        .single();
      if (insertError) throw insertError;

      setDowntimeLogs((prev) => [newDowntime, ...prev]);
      await changeStatus('Down');
      setDowntimeReason('');
      setShowDowntimeForm(false);
    } catch (err) {
      setError('Could not log downtime. Try again.');
    }
    setSavingDowntime(false);
  };

  const endDowntime = async (log) => {
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from('machine_downtime_logs')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', log.id);
    if (updateError) { alert('Could not end downtime. Try again.'); return; }

    setDowntimeLogs((prev) => prev.map((d) => (d.id === log.id ? { ...d, ended_at: new Date().toISOString() } : d)));
    await changeStatus('Running');
  };

  // 7-day analysis
  const last7 = lastNDates(7);
  const totals = useMemo(() => dailyTotals(hourlyLogs), [hourlyLogs]);
  const maxDayTotal = Math.max(1, ...last7.map((d) => totals[d] || 0));
  const weekTotal = last7.reduce((sum, d) => sum + (totals[d] || 0), 0);
  const downtimeThisWeek = totalDowntimeMinutes(downtimeLogs.filter((d) => new Date(d.started_at) >= new Date(last7[0])));

  const hourOptions = Array.from({ length: 24 }, (_, i) => i);

  return (
    <>
      {/* Status + quick actions */}
      <div className="section-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={machineStatusBadgeClass(status)}>{status}</span>
            {machine.notes && <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{machine.notes}</span>}
          </div>
          <select className="input" value={status} onChange={(e) => changeStatus(e.target.value)} style={{ width: 150 }}>
            {MACHINE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {ongoingDowntime && (
          <div style={{ marginTop: 14, padding: 12, background: 'var(--red-bg)', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--red-text)' }}>Down: {ongoingDowntime.reason}</div>
              <div style={{ fontSize: 12, color: 'var(--red-text)', opacity: 0.8 }}>
                Since {new Date(ongoingDowntime.started_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            <button className="btn btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }} onClick={() => endDowntime(ongoingDowntime)}>
              Mark resolved
            </button>
          </div>
        )}

        {!ongoingDowntime && !showDowntimeForm && (
          <button className="link-btn danger" style={{ marginTop: 14 }} onClick={() => setShowDowntimeForm(true)}>
            + Log downtime
          </button>
        )}

        {showDowntimeForm && !ongoingDowntime && (
          <form onSubmit={startDowntime} style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              className="input"
              placeholder="Reason (e.g., Mold change, Breakdown, No material)"
              value={downtimeReason}
              onChange={(e) => setDowntimeReason(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" disabled={savingDowntime} style={{ padding: '10px 16px' }}>
              {savingDowntime ? 'Saving...' : 'Start downtime'}
            </button>
            <button type="button" className="btn btn-secondary" style={{ padding: '10px 16px' }} onClick={() => setShowDowntimeForm(false)}>
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Hourly logging */}
      <div className="section-card">
        <div className="section-title" style={{ marginBottom: 14 }}>Log hourly production</div>
        <form onSubmit={logHour} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
          <input className="input" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} style={{ width: 155 }} />
          <select className="input" value={hourSlot} onChange={(e) => setHourSlot(Number(e.target.value))} style={{ width: 130 }}>
            {hourOptions.map((h) => <option key={h} value={h}>{formatHourSlot(h)}</option>)}
          </select>
          <input
            className="input"
            type="number"
            min="1"
            placeholder="Units produced"
            value={units}
            onChange={(e) => setUnits(e.target.value)}
            style={{ width: 150 }}
          />
          <select className="input" value={orderId} onChange={(e) => setOrderId(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
            <option value="">No order linked</option>
            {orders.map((o) => <option key={o.id} value={o.id}>{o.item_name} — {o.customer_name}</option>)}
          </select>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : '+ Log entry'}
          </button>
        </form>

        {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

        {hourlyLogs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
            No hourly entries yet for the last 7 days.
          </div>
        ) : (
          <div>
            {hourlyLogs.slice(0, 12).map((log) => (
              <div key={log.id} className="prod-log-row">
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13.5 }}>{(log.units_produced || 0).toLocaleString()} units</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginLeft: 8 }}>
                    {new Date(log.log_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {formatHourSlot(log.hour_slot)}
                  </span>
                </div>
                <button className="link-btn danger" onClick={() => deleteHourLog(log)}>Delete</button>
              </div>
            ))}
            {hourlyLogs.length > 12 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 10 }}>
                +{hourlyLogs.length - 12} more entries in the last 7 days
              </div>
            )}
          </div>
        )}
      </div>

      {/* 7-day analysis */}
      <div className="section-card">
        <div className="section-title" style={{ marginBottom: 4 }}>7-day output</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
          {weekTotal.toLocaleString()} units total · {formatMinutes(downtimeThisWeek)} downtime this week
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {last7.map((date) => {
            const total = totals[date] || 0;
            const heightPct = maxDayTotal > 0 ? (total / maxDayTotal) * 100 : 0;
            const isToday = date === todayStr();
            return (
              <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary)' }}>{total > 0 ? total.toLocaleString() : ''}</div>
                <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      width: '100%',
                      height: `${Math.max(3, heightPct)}%`,
                      background: isToday ? 'var(--accent)' : 'var(--blue-dot)',
                      borderRadius: '4px 4px 0 0',
                      opacity: total === 0 ? 0.15 : 1,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10.5, color: isToday ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isToday ? 800 : 600 }}>
                  {new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Downtime history */}
      {downtimeLogs.length > 0 && (
        <div className="section-card">
          <div className="section-title" style={{ marginBottom: 14 }}>Recent downtime</div>
          {downtimeLogs.slice(0, 10).map((d) => (
            <div key={d.id} className="prod-log-row">
              <div>
                <span style={{ fontWeight: 700, fontSize: 13.5 }}>{d.reason}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginLeft: 8 }}>
                  {new Date(d.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {' · '}
                  {d.ended_at
                    ? formatMinutes((new Date(d.ended_at) - new Date(d.started_at)) / 60000)
                    : 'Ongoing'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
