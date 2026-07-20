import type { Metadata, Viewport } from "next";
import { brand } from "@/config/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${brand.companyName} | ${brand.tagline}`,
    template: `%s | ${brand.shortName}`,
  },
  description: `${brand.companyName} agent intranet - leases, billing, maintenance, deposits and renewals.`,
  robots: { index: false, follow: false }, // internal tool - keep out of search
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
