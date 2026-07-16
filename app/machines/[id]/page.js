import Link from 'next/link';
import { notFound } from 'next/navigation';
import AppShell from '@/components/AppShell';
import DateNav from '@/components/DateNav';
import MachineHourlyGrid from '@/components/MachineHourlyGrid';
import { createClient } from '@/lib/supabase-server';
import { todayStr } from '@/lib/machines';

export const dynamic = 'force-dynamic';

export default async function MachineDetailPage({ params, searchParams }) {
  const supabase = createClient();
  const date = searchParams?.date || todayStr();

  const [{ data: machine }, { data: logs }] = await Promise.all([
    supabase.from('machines').select('*').eq('id', params.id).single(),
    supabase.from('machine_hourly_logs').select('*').eq('machine_id', params.id).eq('log_date', date).order('hour_slot', { ascending: true }),
  ]);

  if (!machine) return notFound();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">{machine.name}</div>
          <div className="page-subtitle">Code {machine.code} · Log hourly output below, one row per hour</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href={`/machines/${machine.id}/edit`} className="btn btn-secondary">Edit machine</Link>
          <Link href="/machines" className="btn btn-secondary">All machines</Link>
        </div>
      </div>

      <DateNav basePath={`/machines/${machine.id}`} date={date} />

      <div className="section-card">
        <MachineHourlyGrid machine={machine} logDate={date} initialLogs={logs || []} />
      </div>
    </AppShell>
  );
}
