
-- ===== 0001_init.sql =====
-- ============================================================
-- Bloom Market — initial schema (part 1: tables)
-- ============================================================

-- ---------- PRODUCTS ----------
create table if not exists public.products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  price       integer not null check (price >= 0), -- amount in kobo (NGN)
  image_url   text,
  stock       integer not null default 0 check (stock >= 0),
  created_at  timestamptz not null default now()
);

-- ---------- PROFILES (1:1 with auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ---------- CARTS / CART_ITEMS (guest + signed-in) ----------
create table if not exists public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id         uuid primary key default gen_random_uuid(),
  cart_id    uuid not null references public.carts (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity   integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- ---------- ORDERS / ORDER_ITEMS ----------
create table if not exists public.orders (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete set null,
  email              text not null,
  full_name          text not null default '',
  phone              text not null default '',
  address            text not null default '',
  total              integer not null check (total >= 0), -- kobo
  currency           text not null default 'NGN',
  status             text not null default 'pending'
                     check (status in ('pending', 'paid', 'failed')),
  paystack_reference text unique,
  email_sent_at      timestamptz,
  created_at         timestamptz not null default now()
);

create table if not exists public.order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  name       text not null,                -- snapshot of product name
  price      integer not null check (price >= 0), -- snapshot of price (kobo)
  quantity   integer not null check (quantity > 0)
);

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists carts_user_id_idx on public.carts (user_id);


-- ===== 0002_rls.sql =====
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


-- ===== 0003_profile_trigger.sql =====
-- ============================================================
-- Bloom Market — auto-create a profile row when a user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===== 0004_seed_products.sql =====
-- ============================================================
-- Bloom Market — seed products (prices in kobo, 1500000 = ₦15,000)
-- ============================================================
insert into public.products (name, description, price, image_url, stock) values
  ('Red Rose Bouquet',   'A dozen long-stem red roses wrapped in kraft paper and tied with a satin ribbon.',  1500000, '/products/red-rose-bouquet.svg', 25),
  ('Sunflower Bunch',    'Nine cheerful sunflowers that instantly brighten any room. Locally grown.',         1200000, '/products/sunflower-bunch.svg', 30),
  ('White Orchid Pot',   'Elegant potted phalaenopsis orchid in a ceramic pot. Blooms last for weeks.',      2500000, '/products/white-orchid-pot.svg', 12),
  ('Tulip Mix',          'Fifteen Dutch tulips in a mix of pink, yellow and purple.',                        1800000, '/products/tulip-mix.svg', 20),
  ('Peace Lily',         'Low-maintenance peace lily that thrives indoors. Perfect housewarming gift.',      2000000, '/products/peace-lily.svg', 18),
  ('Succulent Trio',     'Three assorted succulents in mini concrete planters.',                              850000, '/products/succulent-trio.svg', 40),
  ('Baby''s Breath Jar', 'Delicate gypsophila (baby''s breath) arranged in a glass mason jar.',              1000000, '/products/babys-breath-jar.svg', 26),
  ('Hydrangea Vase',     'Two lush hydrangea stems in a keepsake glass vase.',                               2200000, '/products/hydrangea-vase.svg', 15)
on conflict do nothing;


-- ===== 0005_decrement_stock.sql =====
-- ============================================================
-- Bloom Market — atomic stock decrement (called by service role)
-- ============================================================
create or replace function public.decrement_stock(
  p_product_id uuid,
  p_qty integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.products
  set stock = greatest(stock - p_qty, 0)
  where id = p_product_id;
$$;


-- ============================================================
-- Bloom Market - cart identity + cross-device cart sync (0007)
--
-- Why this migration exists:
--   Carts were keyed entirely by the `bm_cart_id` cookie, and
--   `carts.user_id` was never written. That meant a signed-in user
--   on two devices had two unrelated carts. This migration makes the
--   cart belong to the account instead of the browser, which is what
--   lets the website and the installed PWA share one basket.
--
-- Safe to run in order after 0006. It is additive: no data is moved
-- or deleted, and guest carts keep working exactly as before.
-- ============================================================

-- ---------- 1. One cart row per signed-in account ----------
-- The unique index is the guarantee behind cross-device sync: it makes
-- it impossible for the same account to accumulate two user carts
-- under a race. Partial, because guest carts keep a NULL user_id and
-- must remain unlimited and unconstrained.
create unique index if not exists carts_user_id_key
  on public.carts (user_id)
  where user_id is not null;

-- ---------- 2. Realtime delivery for cart_items ----------
-- Supabase Realtime honours Row Level Security. Combined with the
-- policies in step 3, this is what lets an open PWA update its badge
-- the moment another device edits the same cart.
--
-- Guarded so re-running the migration cannot raise
-- "table is already member of publication".
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cart_items'
  ) then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end
$$;

-- ---------- 3. Owner-scoped SELECT access ----------
-- Read-only on purpose. Every INSERT / UPDATE / DELETE still goes
-- through our API routes using the service-role client, so the
-- pricing and stock checks in those routes remain the only way to
-- change a basket. Previously both tables were enabled for RLS with
-- no policies at all, which is why subscriptions would have
-- silently received nothing.
drop policy if exists "carts select own" on public.carts;
create policy "carts select own"
  on public.carts for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cart_items select own" on public.cart_items;
create policy "cart_items select own"
  on public.cart_items for select
  to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );


-- ===== 0008_cart_user_mutations.sql =====
-- ============================================================
-- Bloom Market — Cart RLS write access for authenticated users (0008)
-- ============================================================
drop policy if exists "carts insert own" on public.carts;
create policy "carts insert own"
  on public.carts for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "carts update own" on public.carts;
create policy "carts update own"
  on public.carts for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "carts delete own" on public.carts;
create policy "carts delete own"
  on public.carts for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "cart_items insert own" on public.cart_items;
create policy "cart_items insert own"
  on public.cart_items for insert
  to authenticated
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "cart_items update own" on public.cart_items;
create policy "cart_items update own"
  on public.cart_items for update
  to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "cart_items delete own" on public.cart_items;
create policy "cart_items delete own"
  on public.cart_items for delete
  to authenticated
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and c.user_id = auth.uid()
    )
  );

-- Replica Identity for Realtime DELETE RLS
alter table public.cart_items replica identity full;
alter table public.carts replica identity full;


-- ===== 0009_auth_email_tracking.sql =====
-- ============================================================
-- Bloom Market — Auth email notification tracking columns (0009)
-- ============================================================
alter table public.profiles
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists last_login_notified_at timestamptz;

