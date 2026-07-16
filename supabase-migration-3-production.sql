-- MIGRATION 3: Daily production logging
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- (Run this AFTER supabase-setup.sql and supabase-migration-2-materials.sql)

create table if not exists production_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  quantity integer not null,
  log_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table production_logs enable row level security;

create policy "Signed-in users can view production logs"
  on production_logs for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert production logs"
  on production_logs for insert
  with check (auth.role() = 'authenticated');

create policy "Signed-in users can delete production logs"
  on production_logs for delete
  using (auth.role() = 'authenticated');

create index if not exists production_logs_order_id_idx on production_logs(order_id);
