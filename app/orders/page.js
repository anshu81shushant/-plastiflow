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

  return (
    <AppShell>
      <OrdersList initialOrders={orders || []} />
    </AppShell>
  );
}
