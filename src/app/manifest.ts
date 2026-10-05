import type { MetadataRoute } from "next";

/**
 * The web app manifest that makes Bloom Market installable on Android Chrome,
 * iOS Safari and desktop.
 *
 * Colours are taken from the `@theme` block in `globals.css` so the installed
 * app's chrome matches the site: `canvas` is the page background the splash
 * screen fades from, and `leaf-800` is the icon tile, matching `icon.svg`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bloom Market — Fresh flowers, delivered",
    short_name: "Bloom Market",
    description:
      "An online flower shop. Browse hand-tied bouquets and healthy houseplants, keep your cart across devices, check out securely with Paystack, and get an email confirmation for every order.",
    // Scoped to `/` so the installed app always opens the storefront rather
    // than whichever page happened to be visited when it was installed.
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fcfaf7", // --color-canvas
    theme_color: "#1f3b26", // --color-leaf-800
    categories: ["shopping", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        // Same artwork, inset to ~72% so a circular launcher mask cannot clip
        // the petals. Declared separately per spec rather than as "any maskable".
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}