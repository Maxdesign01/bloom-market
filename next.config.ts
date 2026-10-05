import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        /*
         * The service worker must never be served from the HTTP cache.
         *
         * Browsers check this file to decide whether an update is available, so
         * a cached copy would freeze the installed app on whichever version
         * was cached first — and `sw.js` is the very thing that invalidates its
         * own old caches. `no-cache` still allows storage, it just forces
         * revalidation, which is exactly what is wanted here.
         */
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        /*
         * The manifest is tiny and changes with every release of the app's
         * metadata, so it is revalidated rather than cached.
         */
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "no-cache" }],
      },
    ];
  },
};

export default nextConfig;
