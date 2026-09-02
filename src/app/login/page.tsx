"use client";

import { Suspense } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { brand } from "@/config/brand";

/**
 * Login page - the only public page. Sign-in is via Google, with the allowed
 * email domains enforced server-side; anything else lands back here with
 * ?error=AccessDenied. Button wording lives in src/config/brand.ts.
 */

function LoginCard() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
      <div className="flex flex-col items-center gap-3">
        <Image src={brand.logoSrc} alt={brand.companyName} width={72} height={72} priority />
        <h1 className="text-xl font-bold text-brand-heading">{brand.companyName}</h1>
        <p className="text-sm text-gray-500">{brand.tagline}</p>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error === "AccessDenied"
            ? "That account is not on the approved list. Please sign in with the Google account your office registered for you."
            : "Sign-in failed. Please try again."}
        </div>
      )}

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-brand-primary px-4 py-3 font-semibold text-white transition hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2"
      >
        {/* Google "G" mark */}
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.9 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 5.9 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.4-5.1l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C40.9 35.6 44 30.3 44 24c0-1.3-.1-2.6-.4-3.9z" />
        </svg>
        {brand.signInLabel}
      </button>

      <p className="mt-6 text-center text-xs text-gray-400">
        {brand.accessNote}
        <br />
        Problems signing in? Contact {brand.supportEmail}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-secondary to-brand-secondary-dark p-4">
      <Suspense fallback={null}>
        <LoginCard />
      </Suspense>
    </main>
  );
}
