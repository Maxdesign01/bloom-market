-- ============================================================
-- Bloom Market — RLS policies + signup trigger
-- ============================================================
alter table public.products    enable row level security;
alter table public.profiles    enable row level security;
alter table public.carts       enable row level security;
alter table public.cart_items  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Products: public catalog, readable by everyone
drop policy if exists "products are publicly readable" on public.products;
create policy "products are publicly readable"
  on public.products for select
  to anon, authenticated
  using (true);

-- Profiles: owner only
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Carts / cart_items: NO client policies on purpose.
-- All cart reads/writes go through our API routes with the service role.
-- (RLS enabled + no policy = anon key is denied.)

-- Orders: owner can read their own; writes happen via service role only
drop policy if exists "orders select own" on public.orders;
create policy "orders select own"
  on public.orders for select
  to authenticated
  using (auth.uid() = user_id);

-- Order items: readable when the parent order belongs to the user
drop policy if exists "order_items select own" on public.order_items;
create policy "order_items select own"
  on public.order_items for select
  to authenticated
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );
