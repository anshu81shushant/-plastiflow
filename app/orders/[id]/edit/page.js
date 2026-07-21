import AppShell from '@/components/AppShell';
import OrderForm from '@/components/OrderForm';
import ProductionLog from '@/components/ProductionLog';
import DownloadJobSheetButton from '@/components/DownloadJobSheetButton';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditOrderPage({ params }) {
  const supabase = createClient();
  const { data: order } = await supabase.from('orders').select('*').eq('id', params.id).single();
  const { data: materials } = await supabase.from('raw_materials').select('*').order('name');
  const { data: logs } = await supabase
    .from('production_logs')
    .select('*')
    .eq('order_id', params.id)
    .order('log_date', { ascending: false });

  if (!order) notFound();

  const material = order.material_id ? (materials || []).find((m) => m.id === order.material_id) : null;

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Edit Order</div>
          <div className="page-subtitle">Update details for {order.item_name}</div>
        </div>
        <DownloadJobSheetButton order={order} productionLogs={logs || []} />
      </div>
      <OrderForm initial={order} materials={materials || []} />
      <div style={{ height: 20 }} />
      <ProductionLog order={order} material={material} initialLogs={logs || []} />
    </AppShell>
  );
}
