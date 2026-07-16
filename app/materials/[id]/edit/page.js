import AppShell from '@/components/AppShell';
import MaterialForm from '@/components/MaterialForm';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EditMaterialPage({ params }) {
  const supabase = createClient();
  const { data: material } = await supabase.from('raw_materials').select('*').eq('id', params.id).single();

  if (!material) notFound();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Edit material</div>
          <div className="page-subtitle">Update details for {material.name}</div>
        </div>
      </div>
      <MaterialForm initial={material} />
    </AppShell>
  );
}
