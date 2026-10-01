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
