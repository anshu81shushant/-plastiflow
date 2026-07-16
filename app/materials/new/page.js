import AppShell from '@/components/AppShell';
import MaterialForm from '@/components/MaterialForm';

export const dynamic = 'force-dynamic';

export default function NewMaterialPage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Add material</div>
          <div className="page-subtitle">Track a new raw material for reorder alerts</div>
        </div>
      </div>
      <MaterialForm />
    </AppShell>
  );
}
