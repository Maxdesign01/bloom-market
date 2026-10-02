"use client";

import { useEffect } from "react";

const REVEAL_SELECTOR = "[data-bm-reveal]";

/**
 * A single IntersectionObserver that powers every scroll reveal on the site.
 *
 * Elements opt in by carrying `data-bm-reveal`; this component adds `is-in`
 * the first time each one scrolls into view. Driving it from attributes rather
 * than a wrapper component means the markup around each element stays exactly
 * as it was, so no grid, flex or aspect-ratio container is restructured.
 *
 * Fails safe by design. The hidden start state is gated behind `html.bm-motion`,
 * which the root layout only sets when the visitor has not requested reduced
 * motion, so with JavaScript unavailable nothing is ever left at opacity 0.
 * A MutationObserver picks up sections mounted by client-side navigation.
 */
export function RevealOnScroll() {
  useEffect(() => {
    const showAll = () => {
      document
        .querySelectorAll(REVEAL_SELECTOR)
        .forEach((node) => node.classList.add("is-in"));
    };

    // Nothing to animate, so make sure nothing stays hidden.
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.01 },
    );

    const scan = () => {
      document
        .querySelectorAll(REVEAL_SELECTOR)
        .forEach((node) => observer.observe(node));
    };

    scan();

    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer.disconnect();
    };
  }, []);

  return null;
}