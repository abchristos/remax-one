/**
 * BRANDING - single place to change the company identity.
 *
 * Colours and font live in src/app/globals.css (CSS variables).
 * The logo lives in /public/logo.svg - replace that file with your own
 * (SVG or PNG; if PNG, update `logoSrc` below).
 */
export const brand = {
  companyName: "RE/MAX One Rentals",
  shortName: "One Rentals",
  tagline: "Rentals Agent Portal",
  logoSrc: "/logo.svg",
  supportEmail: "rentals@remax-one.co.za",
} as const;
