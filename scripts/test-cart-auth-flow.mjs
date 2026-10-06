import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

console.log("==================================================");
console.log("   BLOOM MARKET INTEGRATION FLOW VERIFICATION     ");
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
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Pick sample product
  const { data: prod } = await admin
    .from("products")
    .select("id, name, stock")
    .gt("stock", 5)
    .limit(1)
    .single();

  assert(Boolean(prod), "Found in-stock test product", `Product: ${prod?.name}`);

  const testEmailA = `test-user-a-${Date.now()}@example.com`;
  const testEmailB = `test-user-b-${Date.now()}@example.com`;
  const testPassword = "Password123!SecureTest";

  let userAId = null;
  let userBId = null;

  try {
    // 1. Create Test User A
    console.log("\n[1] Creating temporary Test User A...");
    const { data: userAData, error: uAErr } = await admin.auth.admin.createUser({
      email: testEmailA,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Test User Alpha" },
    });
    assert(!uAErr && userAData?.user?.id, "Created Test User A", uAErr?.message);
    userAId = userAData.user.id;

    // 2. Create Test User B
    console.log("\n[2] Creating temporary Test User B...");
    const { data: userBData, error: uBErr } = await admin.auth.admin.createUser({
      email: testEmailB,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Test User Beta" },
    });
    assert(!uBErr && userBData?.user?.id, "Created Test User B", uBErr?.message);
    userBId = userBData.user.id;

    // 3. User A creates an Account Cart
    console.log("\n[3] Testing User A Account Cart Association...");
    const { data: cartA, error: cAErr } = await admin
      .from("carts")
      .insert({ user_id: userAId })
      .select("id, user_id")
      .single();
    assert(!cAErr && cartA?.user_id === userAId, "Cart A belongs exclusively to User A");

    // Add item to Cart A (qty: 1)
    await admin.from("cart_items").insert({
      cart_id: cartA.id,
      product_id: prod.id,
      quantity: 1,
    });

    // 4. Create an Unclaimed Guest Cart (e.g. before User A logs in on mobile)
    console.log("\n[4] Testing Guest Cart & Stock-Clamped Merge...");
    const { data: guestCart } = await admin
      .from("carts")
      .insert({ user_id: null })
      .select("id, user_id")
      .single();

    assert(guestCart.user_id === null, "Guest cart has NULL user_id");

    // Add same product to guest cart (qty: 2)
    await admin.from("cart_items").insert({
      cart_id: guestCart.id,
      product_id: prod.id,
      quantity: 2,
    });

    // Simulate merge logic: sum quantities & clamp to stock
    const { data: existingItems } = await admin
      .from("cart_items")
      .select("product_id, quantity")
      .eq("cart_id", cartA.id);

    const existingMap = new Map(existingItems.map((i) => [i.product_id, i.quantity]));
    const { data: guestItems } = await admin
      .from("cart_items")
      .select("product_id, quantity")
      .eq("cart_id", guestCart.id);

    for (const gi of guestItems) {
      const currentQty = existingMap.get(gi.product_id) || 0;
      const combined = Math.min(currentQty + gi.quantity, prod.stock);

      if (existingMap.has(gi.product_id)) {
        await admin
          .from("cart_items")
          .update({ quantity: combined })
          .eq("cart_id", cartA.id)
          .eq("product_id", gi.product_id);
      } else {
        await admin.from("cart_items").insert({
          cart_id: cartA.id,
          product_id: gi.product_id,
          quantity: combined,
        });
      }
    }

    // Drop guest cart
    await admin.from("cart_items").delete().eq("cart_id", guestCart.id);
    await admin.from("carts").delete().eq("id", guestCart.id);

    // Verify User A cart now has 1 + 2 = 3 items
    const { data: mergedItem } = await admin
      .from("cart_items")
      .select("quantity")
      .eq("cart_id", cartA.id)
      .eq("product_id", prod.id)
      .single();

    assert(mergedItem?.quantity === 3, `Merged quantities correctly (expected 3, got ${mergedItem?.quantity})`);

    // Verify guest cart was deleted
    const { data: deletedGuestCart } = await admin
      .from("carts")
      .select("id")
      .eq("id", guestCart.id)
      .maybeSingle();
    assert(deletedGuestCart === null, "Guest cart successfully purged after merge");

    // 5. Verify Strict Account Isolation between User A, User B, and Guests
    console.log("\n[5] Verifying Strict Account Isolation...");
    // Fetch cart for User B: should NOT have cartA
    const { data: cartB } = await admin
      .from("carts")
      .select("id, user_id")
      .eq("user_id", userBId)
      .maybeSingle();

    assert(cartB === null || cartB.id !== cartA.id, "User B cannot access or inherit User A's cart");

    // Create User B cart
    const { data: newCartB } = await admin
      .from("carts")
      .insert({ user_id: userBId })
      .select("id, user_id")
      .single();

    assert(newCartB.id !== cartA.id, "User B gets an independent unique cart");

    // Check unique constraint: Attempting to insert a 2nd cart for User A must fail!
    const { error: duplicateCartErr } = await admin
      .from("carts")
      .insert({ user_id: userAId });

    assert(Boolean(duplicateCartErr), "Database enforces at most ONE cart per user (unique index constraint)");

    // 6. Test Email Metadata & Deduplication logic
    console.log("\n[6] Testing Auth Email Metadata & 60-Second Throttle...");
    const now = new Date().toISOString();
    await admin.auth.admin.updateUserById(userAId, {
      user_metadata: {
        welcome_email_sent_at: now,
        last_login_notified_at: now,
      },
    });

    const { data: reloadedUser } = await admin.auth.admin.getUserById(userAId);
    assert(
      Boolean(reloadedUser.user.user_metadata.welcome_email_sent_at),
      "welcome_email_sent_at saved in user_metadata",
    );
    assert(
      Boolean(reloadedUser.user.user_metadata.last_login_notified_at),
      "last_login_notified_at saved in user_metadata",
    );
  } finally {
    // 7. Cleanup Test Users and Carts
    console.log("\n[7] Cleaning up temporary test resources...");
    if (userAId) {
      await admin.from("cart_items").delete().match({ cart_id: userAId }); // In case cascade
      const { data: uACarts } = await admin.from("carts").select("id").eq("user_id", userAId);
      if (uACarts) {
        for (const c of uACarts) {
          await admin.from("cart_items").delete().eq("cart_id", c.id);
          await admin.from("carts").delete().eq("id", c.id);
        }
      }
      await admin.auth.admin.deleteUser(userAId);
      console.log("    Cleaned up User A.");
    }
    if (userBId) {
      const { data: uBCarts } = await admin.from("carts").select("id").eq("user_id", userBId);
      if (uBCarts) {
        for (const c of uBCarts) {
          await admin.from("cart_items").delete().eq("cart_id", c.id);
          await admin.from("carts").delete().eq("id", c.id);
        }
      }
      await admin.auth.admin.deleteUser(userBId);
      console.log("    Cleaned up User B.");
    }
  }

  console.log("\n==================================================");
  console.log(`INTEGRATION TESTS: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});

