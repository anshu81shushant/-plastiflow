'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function MaterialForm({ initial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    name: initial?.name || '',
    color: initial?.color || '',
    stock_kg: initial?.stock_kg ?? '',
    reorder_threshold_kg: initial?.reorder_threshold_kg ?? 20,
    supplier_name: initial?.supplier_name || '',
    supplier_contact: initial?.supplier_contact || '',
    notes: initial?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Material name is required.'); return; }
    if (form.stock_kg === '' || Number(form.stock_kg) < 0) { setError('Enter a valid stock amount.'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    const payload = {
      name: form.name.trim(),
      color: form.color.trim(),
      stock_kg: Number(form.stock_kg),
      reorder_threshold_kg: Number(form.reorder_threshold_kg) || 20,
      supplier_name: form.supplier_name.trim(),
      supplier_contact: form.supplier_contact.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (isEdit) {
        const { error: updateError } = await supabase.from('raw_materials').update(payload).eq('id', initial.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('raw_materials').insert(payload);
        if (insertError) throw insertError;
      }
      router.push('/materials');
      router.refresh();
    } catch (err) {
      setError('Could not save material. Try again.');
      setSaving(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-section-title">Material details</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Material name <span className="req">*</span></label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g., HDPE Granules" />
        </div>
        <div className="form-field">
          <label className="form-label">Color / grade</label>
          <input className="input" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g., Natural, Black" />
        </div>

        <div className="form-field">
          <label className="form-label">Current stock (kg) <span className="req">*</span></label>
          <input className="input" type="number" step="0.1" min="0" value={form.stock_kg} onChange={(e) => set('stock_kg', e.target.value)} placeholder="e.g., 500" />
        </div>
        <div className="form-field">
          <label className="form-label">Reorder threshold (kg)</label>
          <input className="input" type="number" step="0.1" min="0" value={form.reorder_threshold_kg} onChange={(e) => set('reorder_threshold_kg', e.target.value)} placeholder="e.g., 20" />
        </div>

        <div className="form-field">
          <label className="form-label">Supplier name</label>
          <input className="input" value={form.supplier_name} onChange={(e) => set('supplier_name', e.target.value)} placeholder="e.g., Reliance Polymers" />
        </div>
        <div className="form-field">
          <label className="form-label">Supplier contact</label>
          <input className="input" value={form.supplier_contact} onChange={(e) => set('supplier_contact', e.target.value)} placeholder="Phone or email" />
        </div>

        <div className="form-field full">
          <label className="form-label">Notes</label>
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Lead time, minimum order quantity, etc." />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Add material'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.push('/materials')}>Cancel</button>
      </div>
    </form>
  );
}

