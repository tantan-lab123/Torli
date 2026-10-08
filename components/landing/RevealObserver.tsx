"use client";

import { useEffect } from "react";
import { REDUCED_MOTION } from "./hooks";

/**
 * Brings [data-reveal] blocks in as they scroll into view. Only blocks that start below
 * the fold are hidden (data-rv="wait"), and only once JavaScript runs, so a slow script
 * or reduced motion never leaves the page blank.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia(REDUCED_MOTION).matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLElement).dataset.rv = "in";
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 }
    );
    const fold = window.innerHeight * 0.9;
    document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().top < fold) return;
      el.dataset.rv = "wait";
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
