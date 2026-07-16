'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

const STEPS = ['welcome', 'material', 'order', 'done'];

export default function StartupKit({ onFinished }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [materialName, setMaterialName] = useState('');
  const [materialStock, setMaterialStock] = useState('');
  const [materialCreated, setMaterialCreated] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [orderCreated, setOrderCreated] = useState(false);

  const finish = (dismissed = false) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('plastiflow-onboarding-done', '1');
    }
    onFinished?.(dismissed);
  };

  const saveMaterial = async () => {
    if (!materialName.trim()) { setError('Enter a material name.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    try {
      const { error: insertError } = await supabase.from('raw_materials').insert({
        name: materialName.trim(),
        stock_kg: materialStock ? Number(materialStock) : 0,
        reorder_threshold_kg: 20,
      });
      if (insertError) throw insertError;
      setMaterialCreated(true);
      setStep(2);
      router.refresh();
    } catch (err) {
      setError('Could not save material. Try again.');
    }
    setSaving(false);
  };

  const saveOrder = async () => {
    if (!customerName.trim()) { setError('Enter a customer name.'); return; }
    if (!quantity || Number(quantity) <= 0) { setError('Enter a valid quantity.'); return; }
    if (!dueDate) { setError('Pick a due date.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    try {
      const { error: insertError } = await supabase.from('orders').insert({
        customer_name: customerName.trim(),
        item_name: itemName.trim() || 'First order',
        quantity: Number(quantity),
        due_date: dueDate,
        status: 'Pending',
      });
      if (insertError) throw insertError;
      setOrderCreated(true);
      setStep(3);
      router.refresh();
    } catch (err) {
      setError('Could not save order. Try again.');
    }
    setSaving(false);
  };

  return (
    <div className="section-card" style={{ borderColor: 'var(--accent)', borderWidth: 1.5 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Quick start
          </div>
          <div className="section-title" style={{ marginTop: 4 }}>Let's set up your shop</div>
        </div>
        <button
          onClick={() => finish(true)}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= step ? 'var(--accent)' : 'var(--gray-bg)',
          }} />
        ))}
      </div>

      {step === 0 && (
        <div>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
            Takes about a minute. We'll add your first raw material and your first order, so you can see how everything fits together.
          </p>
          <button className="btn btn-primary" onClick={() => setStep(1)}>Get started →</button>
        </div>
      )}

      {step === 1 && (
        <div>
          <div className="form-section-title" style={{ marginBottom: 4 }}>Step 1 — Add a raw material</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            e.g. the granules you use most often. You can add more later from the Materials page.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              className="input"
              placeholder="Material name (e.g., HDPE Granules)"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              style={{ flex: 1, minWidth: 160 }}
              autoFocus
            />
            <input
              className="input"
              type="number"
              min="0"
              placeholder="Current stock (kg)"
              value={materialStock}
              onChange={(e) => setMaterialStock(e.target.value)}
              style={{ width: 160 }}
            />
          </div>
          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveMaterial} disabled={saving}>
              {saving ? 'Saving...' : 'Save & continue →'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setError(''); setStep(2); }}>Skip this step</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="form-section-title" style={{ marginBottom: 4 }}>Step 2 — Add your first order</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            Just the basics — you can add photos, pricing, and material details later by editing it.
          </p>
          <div className="form-grid" style={{ marginBottom: 12 }}>
            <div className="form-field">
              <label className="form-label">Customer name</label>
              <input className="input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g., Rajesh Traders" autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Item name</label>
              <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., Plastic Hanger" />
            </div>
            <div className="form-field">
              <label className="form-label">Quantity</label>
              <input className="input" type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 5000" />
            </div>
            <div className="form-field">
              <label className="form-label">Due date</label>
              <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={saveOrder} disabled={saving}>
              {saving ? 'Saving...' : 'Save & continue →'}
            </button>
            <button className="btn btn-secondary" onClick={() => { setError(''); setStep(3); }}>Skip this step</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--green-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>You're all set</div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 18 }}>
            {materialCreated || orderCreated
              ? "Your dashboard now has real data. From here, add more orders, track daily production, and watch material stock automatically."
              : "No problem — you can add materials and orders anytime from the menu below. The app works the same either way."}
          </p>
          <button className="btn btn-primary" onClick={() => finish(false)}>Go to dashboard</button>
        </div>
      )}
    </div>
  );
}
