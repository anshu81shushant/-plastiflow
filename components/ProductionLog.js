'use client';

import { useState, useRef, useEffect } from 'react';
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

// Small status indicator: idle / typing / saving / saved / error
function SaveStatus({ status }) {
  const map = {
    typing: { text: 'Typing…', color: 'var(--text-muted)' },
    saving: { text: 'Saving…', color: 'var(--blue-dot)' },
    saved: { text: '✓ Saved', color: 'var(--green-dot)' },
    error: { text: 'Could not save', color: 'var(--red-dot)' },
  };
  if (!status || !map[status]) return null;
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: map[status].color, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {status === 'saving' && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ animation: 'pf-spin 0.8s linear infinite' }}>
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      )}
      {map[status].text}
      <style>{`@keyframes pf-spin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}

export default function ProductionLog({ order, material, initialLogs }) {
  const router = useRouter();
  const [logs, setLogs] = useState(initialLogs);
  const [quantity, setQuantity] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(null); // null | 'typing' | 'saving' | 'saved' | 'error'
  const [expanded, setExpanded] = useState(true);
  const debounceRef = useRef(null);
  const savedQtyRef = useRef(''); // tracks what quantity value we already saved, to avoid duplicate saves

  const totalProduced = logs.reduce((sum, l) => sum + l.quantity, 0);
  const orderedQty = order.quantity || 0;
  const pct = orderedQty > 0 ? (totalProduced / orderedQty) * 100 : 0;
  const remaining = Math.max(0, orderedQty - totalProduced);

  const materialForThisLog = material && order.material_grams_per_unit
    ? { grams: order.material_grams_per_unit, name: material.name, stock: material.stock_kg }
    : null;

  const doSave = async () => {
    const qty = Number(quantity);
    if (!qty || qty <= 0) { setStatus(null); return; }
    if (qty === Number(savedQtyRef.current)) { setStatus('saved'); return; } // nothing changed since last save

    setStatus('saving');
    const supabase = createClient();

    try {
      const { data: newLog, error: insertError } = await supabase
        .from('production_logs')
        .insert({ order_id: order.id, quantity: qty, log_date: logDate, notes: notes.trim() })
        .select()
        .single();

      if (insertError) throw insertError;

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
      savedQtyRef.current = quantity;
      setStatus('saved');
      setQuantity('');
      setNotes('');
      router.refresh();

      // Clear the "Saved" indicator after a moment so it doesn't linger forever
      setTimeout(() => setStatus((s) => (s === 'saved' ? null : s)), 2500);
    } catch (err) {
      setStatus('error');
    }
  };

  const handleQuantityChange = (val) => {
    setQuantity(val);
    setStatus(val ? 'typing' : null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSave();
    }, 900); // saves ~0.9s after the person stops typing
  };

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            Type units produced — it saves automatically, no button needed.
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="Units produced today"
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              style={{ width: 170 }}
              autoComplete="off"
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
              onBlur={doSave}
              style={{ flex: 1, minWidth: 160 }}
            />
            <SaveStatus status={status} />
          </div>

          {materialForThisLog && quantity && Number(quantity) > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Will deduct ~{((materialForThisLog.grams * Number(quantity)) / 1000).toFixed(2)} kg of {materialForThisLog.name} from stock
            </div>
          )}

          {status === 'error' && (
            <div className="error-banner" style={{ marginBottom: 14 }}>
              Could not save that entry. Check your connection — it'll retry if you edit the quantity again.
            </div>
          )}

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
