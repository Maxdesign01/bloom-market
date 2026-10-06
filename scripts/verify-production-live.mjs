async function verifyLive() {
  console.log("==================================================");
  console.log("       VERIFYING PRODUCTION LIVE DEPLOYMENT        ");
  console.log("==================================================");
  console.log("Target: https://bloom-market-alpha.vercel.app\n");

  // 1. Check /api/auth/login endpoint
  const resApi = await fetch("https://bloom-market-alpha.vercel.app/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid@bloommarket.test", password: "wrongpassword" })
  });
  console.log("1. POST /api/auth/login HTTP Status:", resApi.status);
  const apiJson = await resApi.json().catch(() => null);
  console.log("   API Response:", apiJson);

  // 2. Check /api/cart endpoint
  const resCart = await fetch("https://bloom-market-alpha.vercel.app/api/cart");
  console.log("\n2. GET /api/cart HTTP Status:", resCart.status);
  const cartJson = await resCart.json().catch(() => null);
  console.log("   Cart Items Array Present:", Boolean(cartJson?.cart?.cart_items));
  console.log("   Cookie header received:", Boolean(resCart.headers.get("set-cookie")));

  // 3. Check /login page
  const resLogin = await fetch("https://bloom-market-alpha.vercel.app/login");
  console.log("\n3. GET /login HTTP Status:", resLogin.status);
  const loginHtml = await resLogin.text();

  // Extract JS bundle links
  const scriptRegex = /<script[^>]+src="([^">]+)"/g;
  let match;
  const scriptUrls = [];
  while ((match = scriptRegex.exec(loginHtml)) !== null) {
    scriptUrls.push(match[1]);
  }

  console.log(`\n4. Scanning ${scriptUrls.length} production JS bundle(s) for Login & Account form components...`);
  const bundleFeatures = {
    hasEmailField: false,
    hasPasswordField: false,
    hasLoginTab: false,
    hasCreateAccountTab: false,
    hasGoogleAuth: false,
    hasCartSyncLogic: false,
  };

  for (const url of scriptUrls) {
    const fullUrl = url.startsWith("http") ? url : `https://bloom-market-alpha.vercel.app${url}`;
    const chunkRes = await fetch(fullUrl);
    const chunkText = await chunkRes.text();

    if (chunkText.includes("Email address") || chunkText.includes('type:"email"') || chunkText.includes('type="email"')) bundleFeatures.hasEmailField = true;
    if (chunkText.includes("Password") || chunkText.includes('type:"password"') || chunkText.includes('type="password"')) bundleFeatures.hasPasswordField = true;
    if (chunkText.includes("Log in") || chunkText.includes("Welcome back")) bundleFeatures.hasLoginTab = true;
    if (chunkText.includes("Create account") || chunkText.includes("Create your account")) bundleFeatures.hasCreateAccountTab = true;
    if (chunkText.includes("Continue with Google")) bundleFeatures.hasGoogleAuth = true;
    if (chunkText.includes("cart:updated") || chunkText.includes("cart_items")) bundleFeatures.hasCartSyncLogic = true;
  }

  console.log("\n==================================================");
  console.log("PRODUCTION LIVE VERIFICATION RESULTS:");
  console.log("--------------------------------------------------");
  console.log("  • Email input / field:           ", bundleFeatures.hasEmailField ? "✅ PRESENT" : "❌ MISSING");
  console.log("  • Password input / field:        ", bundleFeatures.hasPasswordField ? "✅ PRESENT" : "❌ MISSING");
  console.log("  • 'Log in' tab / button:         ", bundleFeatures.hasLoginTab ? "✅ PRESENT" : "❌ MISSING");
  console.log("  • 'Create account' tab / button: ", bundleFeatures.hasCreateAccountTab ? "✅ PRESENT" : "❌ MISSING");
  console.log("  • 'Continue with Google' button: ", bundleFeatures.hasGoogleAuth ? "✅ PRESENT" : "❌ MISSING");
  console.log("  • Realtime Cart Sync in bundle:  ", bundleFeatures.hasCartSyncLogic ? "✅ PRESENT" : "❌ MISSING");
  console.log("==================================================");
}

verifyLive().catch(console.error);
