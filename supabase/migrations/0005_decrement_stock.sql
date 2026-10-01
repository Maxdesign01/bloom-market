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
