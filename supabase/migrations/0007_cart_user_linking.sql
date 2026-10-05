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