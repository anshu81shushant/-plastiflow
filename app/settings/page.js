import AppShell from '@/components/AppShell';
import CompanySettingsForm from '@/components/CompanySettingsForm';
import { createClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: settings } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();

  return (
    <AppShell>
      <div className="page-header">
        <div>
          <div className="page-title">Company settings</div>
          <div className="page-subtitle">Used on every invoice you generate</div>
        </div>
      </div>
      <CompanySettingsForm initial={settings} />
    </AppShell>
  );
}
