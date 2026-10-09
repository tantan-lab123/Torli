import type { Config } from "tailwindcss";

// Torli brand palette: electric blue on cool white, with yellow only for "now / next".
// Older screens were written with indigo/violet/slate class names. Those names are
// mapped onto the brand palette below so every screen (and any new code that still
// uses them) stays on brand. Prefer the brand / paper / ink names in new code.
const brand = {
  50: "#F0F5FF",
  100: "#E0EAFF",
  200: "#BFD2FF",
  300: "#8FB0FF",
  400: "#5C8BFF",
  500: "#2E6BFF",
  600: "#0D52E6",
  700: "#0A42BC",
  800: "#0B3594",
  900: "#0C2B73",
  950: "#081A47",
  DEFAULT: "#0D52E6",
};

// Cool neutrals with a slight blue tint: paper backgrounds, hairlines and ink.
const ink = {
  50: "#F6F7F9",
  100: "#EEF0F3",
  200: "#E3E6EB",
  300: "#CBD0D8",
  400: "#9AA1AD",
  500: "#6A717E",
  600: "#4E5460",
  700: "#3A3F49",
  800: "#272B33",
  900: "#16191F",
  950: "#0D0F13",
};

const success = {
  50: "#EEF5EC",
  100: "#E4F0E2",
  200: "#CADBCD",
  300: "#A6C9A9",
  400: "#6FA77A",
  500: "#3B8550",
  600: "#2E7043",
  700: "#1F5A33",
  800: "#184729",
  900: "#12361F",
  950: "#0B2414",
};

const pending = {
  50: "#FBF4E2",
  100: "#FAEFD6",
  200: "#F1DDAE",
  300: "#E6C47A",
  400: "#D9A63E",
  500: "#C98A0B",
  600: "#A56F06",
  700: "#7F5200",
  800: "#643F00",
  900: "#4A2F00",
  950: "#2E1D00",
};

const danger = {
  50: "#FBEFEA",
  100: "#F6E0D7",
  200: "#EDC3B3",
  300: "#E09C84",
  400: "#CC6B4E",
  500: "#B8452B",
  600: "#9E3420",
  700: "#82291A",
  800: "#662015",
  900: "#4D1810",
  950: "#2E0E09",
};

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-brand)", "var(--font-heebo)", "system-ui", "sans-serif"],
        // Phone numbers and links read better in the brand font with tabular digits.
        mono: ["var(--font-brand)", "var(--font-heebo)", "ui-monospace", "monospace"],
      },
      colors: {
        brand,
        ink,
        success,
        pending,
        danger,
        paper: { DEFAULT: "#F6F7F9", surface: "#FFFFFF", line: "#E3E6EB" },
        // The "now / next" accent (yellow). It keeps the name `lime` so screens need no class changes.
        lime: { DEFAULT: "#FFD84A", ink: "#3B2C00", edge: "#E6BC1F", soft: "#FFF4C4" },
        staff: { d: "#2F6B4B", y: "#7A3B69", m: "#B4532A" },
        white: "#FFFFFF",
        primary: {
          ...brand,
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        // Legacy names, mapped onto the brand (see note at the top).
        indigo: brand,
        violet: brand,
        purple: brand,
        blue: brand,
        slate: ink,
        emerald: success,
        teal: success,
        amber: pending,
        orange: pending,
        rose: danger,
        red: danger,
      },
      borderRadius: {
        lg: "8px",
        xl: "10px",
        "2xl": "12px",
        "3xl": "12px",
        "4xl": "14px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(22, 25, 31, 0.06)",
        DEFAULT: "0 1px 2px rgba(22, 25, 31, 0.07)",
        md: "0 2px 6px -2px rgba(22, 25, 31, 0.12)",
        lg: "0 10px 24px -12px rgba(22, 25, 31, 0.2)",
        xl: "0 16px 32px -16px rgba(22, 25, 31, 0.24)",
        "2xl": "0 24px 48px -20px rgba(22, 25, 31, 0.3)",
        soft: "0 1px 0 rgba(22, 25, 31, 0.04)",
        elevated: "0 10px 24px -12px rgba(22, 25, 31, 0.2)",
        glow: "none",
        key: "0 3px 0 rgba(8, 26, 71, 0.5)",
        "key-soft": "0 2px 0 #CBD0D8",
      },
    },
  },
  plugins: [],
};
export default config;
