-- MIGRATION 5: Company settings + GST-compliant invoicing
-- Run this in Supabase: Dashboard → SQL Editor → New query → paste all → Run
-- (Run this AFTER all previous migrations)

-- Your company's details, used on every generated invoice. Single row per account.
create table if not exists company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default '',
  address text,
  gstin text,
  phone text,
  email text,
  bank_name text,
  bank_account_number text,
  bank_ifsc text,
  invoice_prefix text default 'INV',
  next_invoice_number integer default 1,
  updated_at timestamptz not null default now()
);

alter table company_settings enable row level security;

create policy "Signed-in users can view company settings"
  on company_settings for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert company settings"
  on company_settings for insert
  with check (auth.role() = 'authenticated');

create policy "Signed-in users can update company settings"
  on company_settings for update
  using (auth.role() = 'authenticated');

-- GST rate per order, since it varies by product/HSN code
alter table orders add column if not exists gst_rate numeric default 18;
alter table orders add column if not exists hsn_code text;

-- Generated invoices — one per completed order, auto-created on completion
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade not null,
  invoice_number text not null,
  subtotal numeric not null,
  gst_rate numeric not null default 18,
  gst_amount numeric not null,
  total numeric not null,
  generated_at timestamptz not null default now()
);

alter table invoices enable row level security;

create policy "Signed-in users can view invoices"
  on invoices for select
  using (auth.role() = 'authenticated');

create policy "Signed-in users can insert invoices"
  on invoices for insert
  with check (auth.role() = 'authenticated');

create unique index if not exists invoices_order_id_idx on invoices(order_id);
