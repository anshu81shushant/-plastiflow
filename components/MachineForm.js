'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { MACHINE_STATUSES } from '@/lib/machines';

export default function MachineForm({ initial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name || '');
  const [status, setStatus] = useState(initial?.status || 'Running');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter a machine name or number.'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    try {
      if (isEdit) {
        const { error: updateError } = await supabase
          .from('machines')
          .update({ name: name.trim(), status, notes: notes.trim() })
          .eq('id', initial.id);
        if (updateError) throw updateError;
        router.push(`/machines/${initial.id}`);
      } else {
        const { error: insertError } = await supabase
          .from('machines')
          .insert({ name: name.trim(), status, notes: notes.trim() });
        if (insertError) throw insertError;
        router.push('/machines');
      }
      router.refresh();
    } catch (err) {
      setError('Could not save machine. Try again.');
      setSaving(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-section-title">Machine details</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Machine name / number <span className="req">*</span></label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Machine 1, IM-450T" autoFocus />
        </div>
        <div className="form-field">
          <label className="form-label">Status</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {MACHINE_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field full">
          <label className="form-label">Notes</label>
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical' }} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Capacity, tonnage, mold currently fitted, etc." />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add machine'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.push('/machines')}>Cancel</button>
      </div>
    </form>
  );
}
