import AppShell from '@/components/AppShell';
import OrdersList from '@/components/OrdersList';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('due_date', { ascending: true });

  const { data: logs } = await supabase.from('production_logs').select('order_id, quantity');

  const producedByOrder = {};
  (logs || []).forEach((l) => {
    producedByOrder[l.order_id] = (producedByOrder[l.order_id] || 0) + l.quantity;
  });

  const ordersWithProgress = (orders || []).map((o) => ({
    ...o,
    produced_qty: producedByOrder[o.id] || 0,
  }));

  return (
    <AppShell>
      <OrdersList initialOrders={ordersWithProgress} />
    </AppShell>
  );
}
