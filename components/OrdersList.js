'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';
import { STATUSES, statusBadgeClass, daysLeftLabel, formatDate, initials } from '@/lib/orders';

export default function OrdersList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [sortBy, setSortBy] = useState('By Deadline');
  const [error, setError] = useState('');
  const router = useRouter();

  const filtered = useMemo(() => {
    let list = orders.filter((o) => {
      if (statusFilter !== 'All Status' && o.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!(o.item_name + ' ' + o.customer_name).toLowerCase().includes(q)) return false;
      }
      return true;
    });
    if (sortBy === 'By Deadline') {
      list = [...list].sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
    } else if (sortBy === 'Newest First') {
      list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
    return list;
  }, [orders, search, statusFilter, sortBy]);

  const deleteOrder = async (id) => {
    if (!confirm('Delete this order? This cannot be undone.')) return;
    const supabase = createClient();
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) {
      setError('Could not delete order. Try again.');
      return;
    }
    setOrders(orders.filter((o) => o.id !== id));
  };

  const markDone = async (id) => {
    const supabase = createClient();
    const { error } = await supabase.from('orders').update({ status: 'Completed' }).eq('id', id);
    if (error) {
      setError('Could not update order. Try again.');
      return;
    }
    setOrders(orders.map((o) => (o.id === id ? { ...o, status: 'Completed' } : o)));
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">All Orders</div>
          <div className="page-subtitle">{orders.length} total orders</div>
        </div>
        <Link href="/orders/new" className="btn btn-primary">+ New Order</Link>
      </div>

      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Search orders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option>All Status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="input" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option>By Deadline</option>
          <option>Newest First</option>
        </select>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">{orders.length === 0 ? 'No orders yet' : 'No matching orders'}</div>
          <div className="empty-state-sub">
            {orders.length === 0 ? 'Add your first order to start tracking it.' : 'Try a different search or filter.'}
          </div>
          {orders.length === 0 && <Link href="/orders/new" className="btn btn-primary">+ New Order</Link>}
        </div>
      ) : (
        <div className="orders-list">
          {filtered.map((o) => (
            <div key={o.id} className="order-card">
              <div className="order-avatar">
                {o.photo_url ? <img src={o.photo_url} alt={o.item_name} /> : initials(o.item_name)}
              </div>
              <div className="order-card-info">
                <div className="order-card-title-row">
                  <span className="order-card-title">{o.item_name}</span>
                  <span className={statusBadgeClass(o.status)}>{o.status}</span>
                </div>
                <div className="order-card-sub">
                  {o.customer_name} · Qty: {Number(o.quantity || 0).toLocaleString()} · Due: {formatDate(o.due_date)}
                </div>
              </div>
              <div className="order-card-actions">
                <span className="pill">{daysLeftLabel(o.due_date, o.status)}</span>
                {o.status !== 'Completed' && (
                  <button className="link-btn" onClick={() => markDone(o.id)}>Mark done</button>
                )}
                <Link href={`/orders/${o.id}/edit`} className="link-btn">Edit</Link>
                <button className="link-btn danger" onClick={() => deleteOrder(o.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
