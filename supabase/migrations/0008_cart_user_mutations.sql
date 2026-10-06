-- ============================================================
-- Bloom Market — Cart RLS write access for authenticated users (0008)
-- ============================================================

-- ---------- 1. Carts table mutations ----------
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

-- ---------- 2. Cart items table mutations ----------
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

-- ---------- 3. Replica Identity for Realtime DELETE RLS ----------
-- Ensures Supabase Realtime receives the full old row on DELETE, allowing
-- the owner-scoped RLS subquery to evaluate cart_items.cart_id properly.
alter table public.cart_items replica identity full;
alter table public.carts replica identity full;

select pubname, tablename 
from pg_publication_tables 
where pubname = 'supabase_realtime' and tablename = 'cart_items';