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
