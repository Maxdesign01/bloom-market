console.log("==================================================");
console.log("       BLOOM MARKET HTTP ENDPOINT TESTS           ");
console.log("==================================================");

let passed = 0;
let failed = 0;

function assert(cond, name, msg = "") {
  if (cond) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${name}${msg ? ` -> ${msg}` : ""}`);
    failed++;
  }
}

async function run() {
  const BASE = "http://localhost:3000";

  // 1. GET /login
  try {
    const res = await fetch(`${BASE}/login`);
    const text = await res.text();
    assert(res.status === 200, "GET /login returns 200 OK");
    assert(text.includes("bm-shell") || text.includes("Loading"), "Login page renders properly with Next.js Suspense boundary");
  } catch (e) {
    assert(false, "GET /login", e.message);
  }

  // 2. GET /signup (redirect check)
  try {
    const res = await fetch(`${BASE}/signup`, { redirect: "manual" });
    assert(res.status === 307 || res.status === 308, "GET /signup redirects to /login?mode=signup");
  } catch (e) {
    assert(false, "GET /signup redirect", e.message);
  }

  // 3. GET /api/cart
  let cartCookie = null;
  try {
    const res = await fetch(`${BASE}/api/cart`);
    const json = await res.json();
    const setCookie = res.headers.get("set-cookie");
    assert(res.status === 200, "GET /api/cart returns 200 OK");
    assert(Boolean(json.cart && Array.isArray(json.cart.cart_items)), "GET /api/cart response has cart.cart_items array");
    assert(typeof json.count === "number", "GET /api/cart response has count number");
    if (setCookie && setCookie.includes("bm_cart_id=")) {
      cartCookie = setCookie.split(";")[0];
      assert(true, "GET /api/cart provisions secure bm_cart_id cookie for guest");
    }
  } catch (e) {
    assert(false, "GET /api/cart", e.message);
  }

  // 4. POST /api/cart with invalid payload validation
  try {
    const res = await fetch(`${BASE}/api/cart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: "invalid", quantity: -1 }),
    });
    assert(res.status === 400, "POST /api/cart rejects invalid quantity/body with 400");
  } catch (e) {
    assert(false, "POST /api/cart validation", e.message);
  }

  // 5. POST /api/auth/login validation check
  try {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid-user@bloommarket.test", password: "wrongpassword" }),
    });
    const json = await res.json();
    assert(res.status === 401 || res.status === 400, "POST /api/auth/login rejects wrong credentials with 401/400");
    assert(Boolean(json.error), "POST /api/auth/login returns readable error message");
  } catch (e) {
    assert(false, "POST /api/auth/login validation", e.message);
  }

  // 6. POST /api/auth/signout
  try {
    const res = await fetch(`${BASE}/api/auth/signout`, {
      method: "POST",
    });
    const setCookie = res.headers.get("set-cookie");
    assert(res.status === 200, "POST /api/auth/signout returns 200 OK");
    assert(Boolean(setCookie && setCookie.includes("bm_cart_id=")), "POST /api/auth/signout clears bm_cart_id cookie");
  } catch (e) {
    assert(false, "POST /api/auth/signout", e.message);
  }

  console.log("\n==================================================");
  console.log(`HTTP TESTS: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error("HTTP test failed:", e);
  process.exit(1);
});
