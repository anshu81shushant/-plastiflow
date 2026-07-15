-- MIGRATION 2: Raw materials + reorder alerts
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- (Run this AFTER supabase-setup.sql — it adds to what's already there, doesn't replace it)

-- Raw materials stock table
create table if not exists raw_materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,                          -- e.g. "HDPE Natural Granules"
  color text,                                   -- e.g. "Natural", "Black", "Blue" — optional
  stock_kg numeric not null default 0,          -- current stock in kg
  reorder_threshold_kg numeric not null default 20,  -- alert when stock drops below this
  supplier_name text,
  supplier_contact text,
  notes text,
  created_at timestamptz not null default now()
);

alter table raw_materials enable row level security;

create policy "Signed-in users can view materials"
  on raw_materials for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert materials"
  on raw_materials for insert
  with check (auth.role() = 'authenticated');

create policy "Signed-in users can update materials"
  on raw_materials for update
  using (auth.role() = 'authenticated');

create policy "Signed-in users can delete materials"
  on raw_materials for delete
  using (auth.role() = 'authenticated');

-- Link orders to the material they consume, and how much per unit
alter table orders add column if not exists material_id uuid references raw_materials(id) on delete set null;
alter table orders add column if not exists material_grams_per_unit numeric;

-- Stock movement log — every manual restock or manual adjustment is recorded here
-- (auto-deductions from orders are calculated live, not logged as rows, to keep this simple)
create table if not exists material_stock_log (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references raw_materials(id) on delete cascade,
  change_kg numeric not null,          -- positive = restock, negative = manual adjustment/correction
  reason text,                          -- e.g. "Restock from supplier", "Correction after physical count"
  created_at timestamptz not null default now()
);

alter table material_stock_log enable row level security;

create policy "Signed-in users can view stock log"
  on material_stock_log for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert stock log"
  on material_stock_log for insert
  with check (auth.role() = 'authenticated');
