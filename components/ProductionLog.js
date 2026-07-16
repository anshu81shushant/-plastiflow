'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CompletionDial({ pct }) {
  const r = 19;
  const circ = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  const color = clamped >= 100 ? 'var(--green-dot)' : clamped >= 60 ? 'var(--accent)' : 'var(--blue-dot)';

  return (
    <div className="prod-dial">
      <svg width="46" height="46" viewBox="0 0 46 46" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="23" cy="23" r={r} fill="none" stroke="var(--gray-bg)" strokeWidth="4" />
        <circle
          cx="23" cy="23" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - clamped / 100)} strokeLinecap="round"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 800, color }}>
        {Math.round(clamped)}%
      </div>
    </div>
  );
}

export default function ProductionLog({ order, material, initialLogs }) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [quantity, setQuantity] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);

  const totalProduced = logs.reduce((sum, l) => sum + l.quantity, 0);
  const orderedQty = order.quantity || 0;
  const pct = orderedQty > 0 ? (totalProduced / orderedQty) * 100 : 0;
  const remaining = Math.max(0, orderedQty - totalProduced);

  const materialForThisLog = material && order.material_grams_per_unit
    ? { grams: order.material_grams_per_unit, name: material.name, stock: material.stock_kg }
    : null;

  const submit = async (e) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) { setError('Enter a valid quantity produced.'); return; }
    if (!logDate) { setError('Select a date.'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    try {
      const { data: newLog, error: insertError } = await supabase
        .from('production_logs')
        .insert({ order_id: order.id, quantity: qty, log_date: logDate, notes: notes.trim() })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-deduct material stock if this order has a material + grams-per-unit set
      if (materialForThisLog) {
        const consumedKg = (materialForThisLog.grams * qty) / 1000;
        const newStock = Math.max(0, materialForThisLog.stock - consumedKg);
        const { error: stockError } = await supabase
          .from('raw_materials')
          .update({ stock_kg: newStock })
          .eq('id', material.id);
        if (stockError) throw stockError;
      }

      setLogs((prev) => [newLog, ...prev]);
      setQuantity('');
      setNotes('');
      setLogDate(new Date().toISOString().slice(0, 10));
      router.refresh();
    } catch (err) {
      setError('Could not save production entry. Try again.');
    }
    setSaving(false);
  };

  const deleteLog = async (log) => {
    if (!confirm(`Delete this entry (${log.quantity} units on ${formatDate(log.log_date)})? This won't restore deducted material stock.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('production_logs').delete().eq('id', log.id);
    if (error) { alert('Could not delete entry. Try again.'); return; }
    setLogs((prev) => prev.filter((l) => l.id !== log.id));
    router.refresh();
  };

  return (
    <div className="section-card">
      <div className="section-header" style={{ cursor: 'pointer' }} onClick={() => setExpanded((e) => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <CompletionDial pct={pct} />
          <div>
            <div className="section-title">Production log</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>
              {totalProduced.toLocaleString()} / {orderedQty.toLocaleString()} units · {remaining.toLocaleString()} remaining
            </div>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{expanded ? '−' : '+'}</span>
      </div>

      {expanded && (
        <>
          <form onSubmit={submit} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-start' }}>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Units produced"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{ width: 150 }}
            />
            <input
              className="input"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              style={{ width: 160 }}
            />
            <input
              className="input"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '+ Log entry'}
            </button>
          </form>

          {materialForThisLog && quantity && Number(quantity) > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14, marginTop: -6 }}>
              Will deduct ~{((materialForThisLog.grams * Number(quantity)) / 1000).toFixed(2)} kg of {materialForThisLog.name} from stock
            </div>
          )}

          {error && <div className="error-banner" style={{ marginBottom: 14 }}>{error}</div>}

          {logs.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              No production logged yet for this order.
            </div>
          ) : (
            <div>
              {logs.map((log) => (
                <div key={log.id} className="prod-log-row">
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13.5 }}>{log.quantity.toLocaleString()} units</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 12.5, marginLeft: 8 }}>{formatDate(log.log_date)}</span>
                    {log.notes && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{log.notes}</div>}
                  </div>
                  <button className="link-btn danger" onClick={() => deleteLog(log)}>Delete</button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
