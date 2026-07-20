import type { Config } from "tailwindcss";

/**
 * Brand colours are defined as CSS variables in src/app/globals.css so the
 * look and feel can be re-themed in ONE place without touching components.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "var(--brand-primary)",
          "primary-dark": "var(--brand-primary-dark)",
          secondary: "var(--brand-secondary)",
          "secondary-dark": "var(--brand-secondary-dark)",
          surface: "var(--brand-surface)",
          ink: "var(--brand-ink)",
        },
      },
      fontFamily: {
        sans: ["var(--brand-font)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
