'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import { STATUSES } from '@/lib/orders';

export default function OrderForm({ initial }) {
  const router = useRouter();
  const isEdit = !!initial;

  const [form, setForm] = useState({
    customer_name: initial?.customer_name || '',
    item_name: initial?.item_name || '',
    description: initial?.description || '',
    quantity: initial?.quantity || '',
    status: initial?.status || 'Pending',
    days_to_complete: initial?.days_to_complete || 7,
    due_date: initial?.due_date || '',
    price: initial?.price || '',
    notes: initial?.notes || '',
    photo_url: initial?.photo_url || null,
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError('Image too large — pick one under 10MB.');
      return;
    }
    setError('');
    setPhotoFile(file);
    set('photo_url', URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) { setError('Customer name is required.'); return; }
    if (!form.quantity) { setError('Quantity is required.'); return; }
    if (!form.due_date) { setError('Deadline date is required.'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    try {
      let photoUrl = initial?.photo_url || null;

      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-photos')
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('order-photos')
          .getPublicUrl(uploadData.path);
        photoUrl = urlData.publicUrl;
      }

      const payload = {
        customer_name: form.customer_name.trim(),
        item_name: form.item_name.trim() || 'Untitled item',
        description: form.description.trim(),
        quantity: Number(form.quantity),
        status: form.status,
        days_to_complete: Number(form.days_to_complete) || null,
        due_date: form.due_date,
        price: form.price ? Number(form.price) : null,
        notes: form.notes.trim(),
        photo_url: photoUrl,
      };

      if (isEdit) {
        const { error: updateError } = await supabase.from('orders').update(payload).eq('id', initial.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('orders').insert(payload);
        if (insertError) throw insertError;
      }

      router.push('/orders');
      router.refresh();
    } catch (err) {
      setError('Could not save order. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-section-title">Order Information</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Customer Name <span className="req">*</span></label>
          <input className="input" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} placeholder="e.g., Rajesh Traders" />
        </div>
        <div className="form-field">
          <label className="form-label">Item Name</label>
          <input className="input" value={form.item_name} onChange={(e) => set('item_name', e.target.value)} placeholder="e.g., Plastic Hanger - Standard" />
        </div>

        <div className="form-field full">
          <label className="form-label">Item Description</label>
          <textarea className="input" style={{ minHeight: 70, resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Describe the item specifications..." />
        </div>

        <div className="form-field">
          <label className="form-label">Quantity <span className="req">*</span></label>
          <input className="input" type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="e.g., 5000" />
        </div>
        <div className="form-field">
          <label className="form-label">Status</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Days to Complete <span className="req">*</span></label>
          <input className="input" type="number" min="1" value={form.days_to_complete} onChange={(e) => set('days_to_complete', e.target.value)} placeholder="7" />
        </div>
        <div className="form-field">
          <label className="form-label">Deadline Date <span className="req">*</span></label>
          <input className="input" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
        </div>

        <div className="form-field">
          <label className="form-label">Price</label>
          <input className="input" type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="₹ amount" />
        </div>

        <div className="form-field full">
          <label className="form-label">Notes</label>
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical' }} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Any additional notes about this order..." />
        </div>

        <div className="form-field full">
          <label className="form-label">Item Image</label>
          {form.photo_url ? (
            <div className="upload-preview">
              <img src={form.photo_url} alt="Item" />
              <button type="button" className="upload-remove" onClick={() => { set('photo_url', null); setPhotoFile(null); }}>✕</button>
            </div>
          ) : (
            <label className="upload-box">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 8px' }}>
                <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
              </svg>
              <div>Click to upload item image</div>
              <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>PNG, JPG up to 10MB</div>
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
            </label>
          )}
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Order'}
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => router.push('/orders')}>Cancel</button>
      </div>
    </form>
  );
}
