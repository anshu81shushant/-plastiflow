'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function CompanySettingsForm({ initial }) {
  const router = useRouter();
  const [form, setForm] = useState({
    id: initial?.id || null,
    company_name: initial?.company_name || '',
    address: initial?.address || '',
    gstin: initial?.gstin || '',
    phone: initial?.phone || '',
    email: initial?.email || '',
    bank_name: initial?.bank_name || '',
    bank_account_number: initial?.bank_account_number || '',
    bank_ifsc: initial?.bank_ifsc || '',
    invoice_prefix: initial?.invoice_prefix || 'INV',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.company_name.trim()) { setError('Company name is required.'); return; }

    setSaving(true);
    setError('');
    setSaved(false);
    const supabase = createClient();

    const payload = {
      company_name: form.company_name.trim(),
      address: form.address.trim(),
      gstin: form.gstin.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      bank_name: form.bank_name.trim(),
      bank_account_number: form.bank_account_number.trim(),
      bank_ifsc: form.bank_ifsc.trim(),
      invoice_prefix: form.invoice_prefix.trim() || 'INV',
      updated_at: new Date().toISOString(),
    };

    try {
      if (form.id) {
        const { error: updateError } = await supabase.from('company_settings').update(payload).eq('id', form.id);
        if (updateError) throw updateError;
      } else {
        const { data, error: insertError } = await supabase.from('company_settings').insert(payload).select().single();
        if (insertError) throw insertError;
        set('id', data.id);
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError('Could not save settings. Try again.');
    }
    setSaving(false);
  };

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-section-title">Company details</div>
      <div className="form-grid">
        <div className="form-field full">
          <label className="form-label">Company name <span className="req">*</span></label>
          <input className="input" value={form.company_name} onChange={(e) => set('company_name', e.target.value)} placeholder="e.g., Your Moulding Works Pvt Ltd" />
        </div>
        <div className="form-field full">
          <label className="form-label">Address</label>
          <textarea className="input" style={{ minHeight: 60, resize: 'vertical' }} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full business address" />
        </div>
        <div className="form-field">
          <label className="form-label">GSTIN</label>
          <input className="input" value={form.gstin} onChange={(e) => set('gstin', e.target.value)} placeholder="e.g., 24ABCDE1234F1Z5" />
        </div>
        <div className="form-field">
          <label className="form-label">Invoice number prefix</label>
          <input className="input" value={form.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} placeholder="e.g., INV" />
        </div>
        <div className="form-field">
          <label className="form-label">Phone</label>
          <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="Business phone" />
        </div>
        <div className="form-field">
          <label className="form-label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="Business email" />
        </div>
      </div>

      <div className="form-section-title" style={{ marginTop: 24 }}>Bank details (for invoice payment info)</div>
      <div className="form-grid">
        <div className="form-field">
          <label className="form-label">Bank name</label>
          <input className="input" value={form.bank_name} onChange={(e) => set('bank_name', e.target.value)} placeholder="e.g., HDFC Bank" />
        </div>
        <div className="form-field">
          <label className="form-label">Account number</label>
          <input className="input" value={form.bank_account_number} onChange={(e) => set('bank_account_number', e.target.value)} />
        </div>
        <div className="form-field">
          <label className="form-label">IFSC code</label>
          <input className="input" value={form.bank_ifsc} onChange={(e) => set('bank_ifsc', e.target.value)} />
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {saved && <div className="success-banner">✓ Settings saved</div>}

      <div style={{ marginTop: 20 }}>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving...' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
