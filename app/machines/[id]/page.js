import AppShell from '@/components/AppShell';
import MachineDetail from '@/components/MachineDetail';
import { createClient } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import { lastNDates } from '@/lib/machines';

export const dynamic = 'force-dynamic';

export default async function MachineDetailPage({ params }) {
  const supabase = createClient();
  const sevenDaysAgo = lastNDates(7)[0];

  const [{ data: machine }, { data: hourlyLogs }, { data: downtimeLogs }, { data: orders }] = await Promise.all([
    supabase.from('machines').select('*').eq('id', params.id).single(),
    supabase.from('machine_hourly_logs').select('*').eq('machine_id', params.id).gte('log_date', sevenDaysAgo).order('log_date', { ascending: false }).order('hour_slot', { ascending: false }),
    supabase.from('machine_downtime_logs').select('*').eq('machine_id', params.id).order('started_at', { ascending: false }).limit(20),
    supabase.from('orders').select('id, item_name, customer_name').neq('status', 'Completed').order('due_date'),
  ]);

  if (!machine) notFound();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">{machine.name}</div>
          <div className="page-subtitle">Hourly production, downtime, and 7-day trend</div>
        </div>
      </div>
      <MachineDetail
        machine={machine}
        initialHourlyLogs={hourlyLogs || []}
        initialDowntimeLogs={downtimeLogs || []}
        orders={orders || []}
      />
    </AppShell>
  );
}
