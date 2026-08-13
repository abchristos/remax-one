"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Wrench,
  Banknote,
  RotateCw,
  MessageSquare,
  CreditCard,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { brand } from "@/config/brand";

/**
 * Application shell: fixed left sidebar on desktop, slide-in drawer on
 * mobile, top bar with the signed-in user and sign-out.
 */

interface ShellUser {
  name: string;
  email: string;
  image?: string | null;
}

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leases", label: "My Leases", icon: FileText },
  { href: "/billing", label: "My Billing", icon: Receipt },
  { href: "/maintenance", label: "My Maintenance", icon: Wrench },
  { href: "/deposits", label: "My Deposit Payouts", icon: Banknote },
  { href: "/renewals", label: "My Renewals", icon: RotateCw },
  { href: "/queries", label: "My Queries", icon: MessageSquare },
  { href: "/pops", label: "My POPs", icon: CreditCard },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3" aria-label="Main menu">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-white/15 text-white"
                : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-brand-secondary">
      <div className="flex items-center gap-3 px-5 py-5">
        <Image src={brand.logoSrc} alt="" width={36} height={36} />
        <div>
          <p className="text-sm font-bold leading-tight text-white">{brand.companyName}</p>
          <p className="text-xs text-white/60">{brand.tagline}</p>
        </div>
      </div>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto p-4 text-center text-[11px] text-white/40">
        © {new Date().getFullYear()} {brand.companyName}
      </div>
    </div>
  );
}

export default function PortalShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 md:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 rounded-md p-1 text-white/80 hover:text-white"
            >
              <X size={22} />
            </button>
            <SidebarContent onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="rounded-md p-1.5 text-brand-secondary hover:bg-gray-100 md:hidden"
          >
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element -- external Google avatar
              <img
                src={user.image}
                alt=""
                width={34}
                height={34}
                className="rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand-secondary text-sm font-bold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:border-brand-primary hover:text-brand-primary"
            >
              <LogOut size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
