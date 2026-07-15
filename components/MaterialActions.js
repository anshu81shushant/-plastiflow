'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function MaterialActions({ material }) {
  const [restocking, setRestocking] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const submitRestock = async (e) => {
    e.preventDefault();
    const kg = Number(amount);
    if (!kg || kg <= 0) { setError('Enter a valid amount in kg.'); return; }

    setSaving(true);
    setError('');
    const supabase = createClient();

    try {
      const { error: updateError } = await supabase
        .from('raw_materials')
        .update({ stock_kg: material.stock_kg + kg })
        .eq('id', material.id);
      if (updateError) throw updateError;

      await supabase.from('material_stock_log').insert({
        material_id: material.id,
        change_kg: kg,
        reason: 'Restock',
      });

      setRestocking(false);
      setAmount('');
      router.refresh();
    } catch (err) {
      setError('Could not save restock. Try again.');
    }
    setSaving(false);
  };

  const deleteMaterial = async () => {
    if (!confirm(`Delete "${material.name}"? Orders using it will keep their history but lose the link.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from('raw_materials').delete().eq('id', material.id);
    if (error) {
      alert('Could not delete material. Try again.');
      return;
    }
    router.refresh();
  };

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
      {!restocking ? (
        <div style={{ display: 'flex', gap: 16 }}>
          <button className="link-btn" onClick={() => setRestocking(true)}>+ Record restock</button>
          <Link href={`/materials/${material.id}/edit`} className="link-btn">Edit</Link>
          <button className="link-btn danger" onClick={deleteMaterial}>Delete</button>
        </div>
      ) : (
        <form onSubmit={submitRestock} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input"
            type="number"
            step="0.1"
            min="0"
            placeholder="kg received"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: 140 }}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '8px 14px' }}>
            {saving ? 'Saving...' : 'Add to stock'}
          </button>
          <button type="button" className="btn btn-secondary" style={{ padding: '8px 14px' }} onClick={() => { setRestocking(false); setError(''); }}>
            Cancel
          </button>
          {error && <span style={{ color: 'var(--red-text)', fontSize: 13 }}>{error}</span>}
        </form>
      )}
    </div>
  );
}
