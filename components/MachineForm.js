'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function MachineForm({ initial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name: initial?.name || '',
    code: initial?.code || '',
    capacity_per_hour: initial?.capacity_per_hour ?? '',
    active: initial?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Machine name is required.'); return; }
    if (!form.code.trim()) { setError('Machine code is required (e.g. M1).'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      capacity_per_hour: form.capacity_per_hour === '' ? null : Number(form.capacity_per_hour),
      active: form.active,
    };

    try {
      if (isEdit) {
        const { error: updateError } = await supabase.from('machines').update(payload).eq('id', initial.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('machines').insert(payload);
        if (insertError) throw insertError;
      }
      router.push('/machines');
      router.refresh();
    } catch (err) {
      setError('Could not save machine. Try again.');
      setSaving(false);
    }
  };

  const deleteMachine = async () => {
    if (!confirm(`Delete "${initial.name}"? All its hourly production logs will be deleted too.`)) return;
    setSaving(true);
    const supabase = createClient();
    const { error: deleteError } = await supabase.from('machines').delete().eq('id', initial.id);
    if (deleteError) {
      alert('Could not delete machine. Try again.');
      setSaving(false);
      return;
    }
    router.push('/machines');
    router.refresh();
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-section-title">Machine details</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Machine name <span className="req">*</span></label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., Machine 8" />
        </div>
        <div className="form-field">
          <label className="form-label">Code <span className="req">*</span></label>
          <input className="input" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="e.g., M8" />
        </div>

        <div className="form-field">
          <label className="form-label">Target capacity (units/hour)</label>
          <input
            className="input" type="number" min="0" value={form.capacity_per_hour}
            onChange={(e) => set('capacity_per_hour', e.target.value)} placeholder="e.g., 120"
          />
        </div>
        <div className="form-field">
          <label className="form-label">Status</label>
          <select className="input" value={form.active ? '1' : '0'} onChange={(e) => set('active', e.target.value === '1')}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add machine'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.push('/machines')}>Cancel</button>
        {isEdit && (
          <button type="button" className="link-btn danger" style={{ marginLeft: 'auto' }} onClick={deleteMachine} disabled={saving}>
            Delete machine
          </button>
        )}
      </div>
    </form>
  );
}
