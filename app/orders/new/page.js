import AppShell from '@/components/AppShell';
import OrderForm from '@/components/OrderForm';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const supabase = createClient();
  const { data: materials } = await supabase.from('raw_materials').select('*').order('name');

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">New Order</div>
          <div className="page-subtitle">Add a new plastic moulding order</div>
        </div>
      </div>
      <OrderForm materials={materials || []} />
    </AppShell>
  );
}
