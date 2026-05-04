create table if not exists public.product_compatibility (
  id            uuid primary key default gen_random_uuid(),
  source_product_id uuid not null references public.products(id) on delete cascade,
  target_product_id uuid not null references public.products(id) on delete cascade,
  sort_order    integer not null default 0,
  note          text,
  created_at    timestamptz not null default now(),
  constraint product_compatibility_no_self check (source_product_id <> target_product_id),
  constraint product_compatibility_unique unique (source_product_id, target_product_id)
);

create index if not exists idx_product_compatibility_source on public.product_compatibility (source_product_id, sort_order);

comment on table public.product_compatibility is 'Explicit manual links between products (compatible/related accessories).';
