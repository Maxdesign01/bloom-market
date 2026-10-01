# Bloom Market

An online flower shop built with Next.js 16 (App Router), Supabase, Paystack and
Mailgun. Customers browse a catalogue, keep a database-backed cart, check out
through Paystack's hosted page, and receive an email confirmation the moment
payment clears.

All prices are stored and processed in **kobo** (1 NGN = 100 kobo) and displayed
as Naira via `formatNaira()`.

## Features

| Feature | Where it lives |
| --- | --- |
| Product catalogue + detail pages | `src/app/page.tsx`, `src/app/products/[id]/page.tsx` |
| Database-backed cart (works for guests) | `src/lib/cart.ts`, `src/app/api/cart/route.ts` |
| Checkout page with shipping form | `src/app/checkout/page.tsx`, `src/components/CheckoutForm.tsx` |
| Paystack payment (hosted redirect) | `src/app/api/checkout/route.ts` |
| Signature-verified Paystack webhook | `src/app/api/paystack/webhook/route.ts` |
| Mailgun order confirmation email | `src/lib/mailgun.ts` |
| Google sign-in (Supabase Auth) | `src/app/login/page.tsx`, `src/app/auth/callback/route.ts` |
| Order history | `src/app/orders/page.tsx` |
| Row Level Security on every table | `supabase/migrations/0002_rls.sql` |

## Stack

- **Next.js 16.3.8** (App Router, Turbopack), React 19, TypeScript (strict)
- **Tailwind CSS v4** — zinc neutrals + `emerald-600` as the single accent
- **Supabase** — Postgres, Auth, Row Level Security
- **Paystack** — payments (test mode by default)
- **Mailgun** — transactional email

> This Next.js version renamed `middleware.ts` to `proxy.ts`; see `AGENTS.md`.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`.

### Environment variables

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (**server only**) |
| `PAYSTACK_SECRET_KEY` | Paystack → Settings → API Keys & Webhooks (test mode) |
| `MAILGUN_API_KEY` | Mailgun → Sending → API Keys |
| `MAILGUN_DOMAIN` | Mailgun → Sending → Domains |
| `MAILGUN_REGION` | Mailgun → API Keys page (e.g. `api.mailgun.net`) |
| `MAILGUN_FROM` | Sender address on your Mailgun domain |
| `NEXT_PUBLIC_SITE_URL` | Your deployed origin; defaults to `http://localhost:3000` |
## Database setup

Migrations live in `supabase/migrations/` and are safe to run in order.
`supabase/setup.sql` is a concatenated copy of all of them for convenience.

| File | Contents |
| --- | --- |
| `0001_init.sql` | `products`, `profiles`, `carts`, `cart_items`, `orders`, `order_items` + indexes |
| `0002_rls.sql` | Enables RLS and adds every policy |
| `0003_profile_trigger.sql` | Creates a `profiles` row whenever a user signs up |
| `0004_seed_products.sql` | Seeds the eight demo products |
| `0005_decrement_stock.sql` | `decrement_stock()` RPC used after payment |

Run them in the **Supabase SQL Editor** in filename order, or via the Management
API:

```bash
curl -X POST "https://api.supabase.com/v1/projects/<project-ref>/database/query" \
  -H "Authorization: Bearer <personal-access-token>" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"$(cat supabase/migrations/0001_init.sql)\"}"
```

### Tables

- **`products`** — `name`, `description`, `price` (kobo), `image_url`, `stock`
- **`profiles`** — mirrors `auth.users`, populated by a trigger
- **`carts` / `cart_items`** — guest carts, addressed by the `bm_cart_id` cookie
- **`orders` / `order_items`** — orders snapshot the product name and price, so
  later catalogue edits never rewrite history

## External service configuration

### Google sign-in

1. [Google Cloud Console](https://console.cloud.google.com) → new project
2. **APIs & Services → OAuth consent screen** → External → add your email and the
   `email`, `openid` and `userinfo.profile` scopes → add yourself under
   **Audience → Test users** (required while the app is in *Testing*)
3. **Credentials → Create OAuth client ID → Web application**, authorized
   redirect URI:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

4. In **Supabase → Authentication → Providers → Google**, enable it and paste
   the Client ID and Client Secret
5. In **Authentication → URL Configuration**, set Site URL to your origin and
   add `<origin>/auth/callback` to the redirect allow-list

### Paystack

- Switch the dashboard to **Test mode** and copy the test secret key
- The checkout flow uses **hosted redirect**, so no public key or JS SDK is
  needed
- Register the webhook after deploying:
  `https://<your-domain>/api/paystack/webhook`

### Mailgun

- Use a sandbox domain for development, or add DNS records for a domain you own
- Sandbox domains only deliver to **Authorized Recipients** — add the address
  you want to receive confirmations at
- In production, replace the sandbox domain and `MAILGUN_FROM` accordingly

## Testing

Paystack test card — any future expiry, any CVV, any PIN:

```
4242 4242 4242 4242
```

Localhost cannot receive webhooks. To exercise `/api/paystack/webhook` yourself,
sign a payload the same way Paystack does:

```js
## How checkout works

1. The browser POSTs the shipping form to `/api/checkout`.
2. The server **re-reads the cart from the database** and recomputes the total
   from live product prices — prices sent by the client are never trusted.
3. A `pending` order plus its `order_items` are written to Supabase. If the
   items fail to insert, the order is rolled back.
4. Paystack `/transaction/initialize` is called with the total in kobo and a
   callback URL of `/checkout/success?reference=...`.
5. The browser is redirected to Paystack's hosted checkout page.

After payment, **two** requests can arrive:

- the **webhook** (`/api/paystack/webhook`), verified with the
  `x-paystack-signature` HMAC-SHA512 header, and
- the **browser callback** (`/checkout/success`), which re-verifies the
  transaction against Paystack's API rather than trusting the redirect.

Both call `markOrderPaid()`, which performs a conditional update
(`status = pending → paid`). Only the request that actually changes the row
(`won: true`) sends the confirmation email and decrements stock, so the customer
receives exactly one email no matter how many times the event is delivered. An
email or stock failure is logged but never fails the payment.

## Security notes

- **Server-side pricing.** `/api/checkout` recalculates totals from the database.
- **Service-role isolation.** `carts` and `cart_items` have RLS enabled with *no*
  policies, so the public anon key cannot reach them; all cart traffic goes
  through API routes using the admin client.
- **Webhook signatures** are compared with `timingSafeEqual`.
- **Open-redirect protection** in `/auth/callback` rejects non-relative `next`.
- **Email interpolation** is escaped with `escapeHtml()` in `mailgun.ts`.
- `.env.local` is git-ignored. Only `.env.example` should ever be committed.

## Project structure

```
src/
├── proxy.ts                     Next 16 middleware — refreshes the Supabase session
├── app/                         Routes, API handlers and pages
├── components/                  Header, CartView, CheckoutForm, AddToCartButton
└── lib/
    ├── supabase/                browser, server, admin and proxy clients
    ├── cart.ts                  cookie cart + database cart operations
    ├── orders.ts                idempotent markOrderPaid()
    ├── paystack.ts              initialize / verify / webhook signature
    ├── mailgun.ts               confirmation email
    ├── format.ts                kobo ⇄ Naira helpers
    └── types.ts                 shared types
supabase/migrations/             ordered SQL migrations
public/products/                 product artwork (SVG)
```

## Before deploying

- [ ] Swap the Paystack test key for a live secret key
- [ ] Replace the Mailgun sandbox domain with a verified sending domain
- [ ] Point `NEXT_PUBLIC_SITE_URL` at your real origin and add it to Supabase's
      redirect allow-list
- [ ] Register `https://<your-domain>/api/paystack/webhook` with Paystack
- [ ] Publish the Google consent screen if you need users outside your test list
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` and any Supabase personal access token
      used for setup
const sig = crypto
  .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
  .update(body)
  .digest("hex");

await fetch("http://localhost:3000/api/paystack/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-paystack-signature": sig },
  body,
});
```

Sending the same event twice must return `"marked": false` the second time — that
is the idempotency guarantee.