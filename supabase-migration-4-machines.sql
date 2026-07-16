-- MIGRATION 4: Machines & hourly production tracking
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- (Run this AFTER supabase-setup.sql, migration-2-materials.sql, migration-3-production.sql)

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  capacity_per_hour integer,           -- target units/hour, used for efficiency %. Optional.
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists machine_hourly_logs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade not null,
  log_date date not null default current_date,
  hour_slot smallint not null check (hour_slot between 0 and 23),  -- 8 = the 08:00-09:00 hour
  quantity integer not null default 0,        -- good units produced that hour
  rejected_qty integer not null default 0,    -- rejected/scrap units that hour
  downtime_minutes integer not null default 0,-- machine stoppage minutes that hour
  operator_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (machine_id, log_date, hour_slot)
);

alter table machines enable row level security;
alter table machine_hourly_logs enable row level security;

create policy "Signed-in users can view machines"
  on machines for select
  using (auth.role() = 'authenticated');
create policy "Signed-in users can insert machines"
  on machines for insert
  with check (auth.role() = 'authenticated');
create policy "Signed-in users can update machines"
  on machines for update
  using (auth.role() = 'authenticated');
create policy "Signed-in users can delete machines"
  on machines for delete
  using (auth.role() = 'authenticated');

create policy "Signed-in users can view hourly logs"
  on machine_hourly_logs for select
  using (auth.role() = 'authenticated');
create policy "Signed-in users can insert hourly logs"
  on machine_hourly_logs for insert
  with check (auth.role() = 'authenticated');
create policy "Signed-in users can update hourly logs"
  on machine_hourly_logs for update
  using (auth.role() = 'authenticated');
create policy "Signed-in users can delete hourly logs"
  on machine_hourly_logs for delete
  using (auth.role() = 'authenticated');

create index if not exists machine_hourly_logs_machine_idx on machine_hourly_logs(machine_id);
create index if not exists machine_hourly_logs_date_idx on machine_hourly_logs(log_date);

-- Seed your 7 injection moulding machines (safe to edit names/capacity after, or add more via the app)
insert into machines (name, code, capacity_per_hour)
select v.name, v.code, v.capacity_per_hour
from (values
  ('Machine 1', 'M1', 120),
  ('Machine 2', 'M2', 120),
  ('Machine 3', 'M3', 120),
  ('Machine 4', 'M4', 120),
  ('Machine 5', 'M5', 120),
  ('Machine 6', 'M6', 120),
  ('Machine 7', 'M7', 120)
) as v(name, code, capacity_per_hour)
where not exists (select 1 from machines);
