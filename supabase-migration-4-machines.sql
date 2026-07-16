-- MIGRATION 4: Machines + hourly production/downtime logging
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- (Run this AFTER supabase-setup.sql, migration-2-materials, and migration-3-production)

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- e.g. "Machine 1", "IM-450T"
  status text not null default 'Running' check (status in ('Running', 'Idle', 'Down', 'Maintenance')),
  notes text,
  created_at timestamptz not null default now()
);

alter table machines enable row level security;

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

-- Hourly production entries per machine. order_id is optional (machines can run independent of a specific order).
create table if not exists machine_hourly_logs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade not null,
  order_id uuid references orders(id) on delete set null,
  log_date date not null default current_date,
  hour_slot integer not null check (hour_slot >= 0 and hour_slot <= 23),  -- 0-23, the hour this entry covers
  units_produced integer not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

alter table machine_hourly_logs enable row level security;

create policy "Signed-in users can view hourly logs"
  on machine_hourly_logs for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert hourly logs"
  on machine_hourly_logs for insert
  with check (auth.role() = 'authenticated');

create policy "Signed-in users can delete hourly logs"
  on machine_hourly_logs for delete
  using (auth.role() = 'authenticated');

create index if not exists machine_hourly_logs_machine_idx on machine_hourly_logs(machine_id, log_date);

-- Downtime events per machine — separate from hourly output, since downtime spans
-- a period rather than fitting neatly into one hour slot.
create table if not exists machine_downtime_logs (
  id uuid primary key default gen_random_uuid(),
  machine_id uuid references machines(id) on delete cascade not null,
  reason text not null,                 -- e.g. "Mold change", "Breakdown", "No material", "Power cut"
  started_at timestamptz not null default now(),
  ended_at timestamptz,                 -- null while ongoing
  notes text,
  created_at timestamptz not null default now()
);

alter table machine_downtime_logs enable row level security;

create policy "Signed-in users can view downtime logs"
  on machine_downtime_logs for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert downtime logs"
  on machine_downtime_logs for insert
  with check (auth.role() = 'authenticated');

create policy "Signed-in users can update downtime logs"
  on machine_downtime_logs for update
  using (auth.role() = 'authenticated');

create policy "Signed-in users can delete downtime logs"
  on machine_downtime_logs for delete
  using (auth.role() = 'authenticated');

create index if not exists machine_downtime_logs_machine_idx on machine_downtime_logs(machine_id);
