-- ============================================================
-- Bloom Market — swap the illustrated product placeholders for
-- real flower photography.
--
-- This is a DATA-ONLY migration. It does not touch the schema,
-- prices, names, stock levels, SKUs or any product logic — it only
-- rewrites products.image_url to the new photo asset in /public.
--
-- Each image is matched to the product's own name and description,
-- so the catalogue stays internally consistent.
-- ============================================================
update public.products set image_url = '/products/red-rose-bouquet.jpg'
where name = 'Red Rose Bouquet';

update public.products set image_url = '/products/sunflower-bunch.jpg'
where name = 'Sunflower Bunch';

update public.products set image_url = '/products/white-orchid-pot.jpg'
where name = 'White Orchid Pot';

update public.products set image_url = '/products/tulip-mix.jpg'
where name = 'Tulip Mix';

update public.products set image_url = '/products/peace-lily.jpg'
where name = 'Peace Lily';

update public.products set image_url = '/products/succulent-trio.jpg'
where name = 'Succulent Trio';

update public.products set image_url = '/products/babys-breath-jar.jpg'
where name = 'Baby''s Breath Jar';

update public.products set image_url = '/products/hydrangea-vase.jpg'
where name = 'Hydrangea Vase';
