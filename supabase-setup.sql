-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste all → Run

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  customer_name text not null,
  item_name text not null,
  description text,
  quantity integer not null default 0,
  status text not null default 'Pending' check (status in ('Pending', 'In Progress', 'Completed', 'Delayed')),
  days_to_complete integer,
  due_date date not null,
  price numeric,
  notes text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table orders enable row level security;

-- Any signed-in user of your company can see and manage all orders (shared team data).
-- If you want each user to only see their own orders, see the alternate policies at the bottom.
create policy "Signed-in users can view orders"
  on orders for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert orders"
  on orders for insert
  with check (auth.role() = 'authenticated');

create policy "Signed-in users can update orders"
  on orders for update
  using (auth.role() = 'authenticated');

create policy "Signed-in users can delete orders"
  on orders for delete
  using (auth.role() = 'authenticated');

-- Storage bucket for item photos
insert into storage.buckets (id, name, public)
values ('order-photos', 'order-photos', true)
on conflict (id) do nothing;

create policy "Public read access to order photos"
  on storage.objects for select
  using (bucket_id = 'order-photos');

create policy "Signed-in users can upload order photos"
  on storage.objects for insert
  with check (bucket_id = 'order-photos' and auth.role() = 'authenticated');

create policy "Signed-in users can delete order photos"
  on storage.objects for delete
  using (bucket_id = 'order-photos' and auth.role() = 'authenticated');

-- ============================================================
-- ALTERNATE: private-per-user orders instead of shared team data.
-- If you want this instead, drop the 4 policies above and use these:
-- ============================================================
-- create policy "Users manage their own orders"
--   on orders for all
--   using (auth.uid() = user_id)
--   with check (auth.uid() = user_id);
