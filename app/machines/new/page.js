import AppShell from '@/components/AppShell';
import MachineForm from '@/components/MachineForm';

export const dynamic = 'force-dynamic';

export default function NewMachinePage() {
  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Add machine</div>
          <div className="page-subtitle">Add another injection moulding machine to track</div>
        </div>
      </div>
      <MachineForm />
    </AppShell>
  );
}
