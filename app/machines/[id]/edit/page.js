import AppShell from '@/components/AppShell';
import MachineForm from '@/components/MachineForm';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditMachinePage({ params }) {
  const supabase = createClient();
  const { data: machine } = await supabase.from('machines').select('*').eq('id', params.id).single();

  if (!machine) notFound();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Edit machine</div>
          <div className="page-subtitle">Update details for {machine.name}</div>
        </div>
      </div>
      <MachineForm initial={machine} />
    </AppShell>
  );
}
