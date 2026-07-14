import AppShell from '@/components/AppShell';
import OrderForm from '@/components/OrderForm';

export default function NewOrderPage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">New Order</div>
          <div className="page-subtitle">Add a new plastic moulding order</div>
        </div>
      </div>
      <OrderForm />
    </AppShell>
  );
}
