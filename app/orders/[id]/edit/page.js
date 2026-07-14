import AppShell from '@/components/AppShell';
import OrderForm from '@/components/OrderForm';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';

export default async function EditOrderPage({ params }) {
  const supabase = createClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', params.id).single();

  if (!order) notFound();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Edit Order</div>
          <div className="page-subtitle">Update details for {order.item_name}</div>
        </div>
      </div>
      <OrderForm initial={order} />
    </AppShell>
  );
}
