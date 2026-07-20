import { NextResponse } from "next/server";

/**
 * GET /api/health - liveness/readiness probe for uptime monitoring.
 * Reports which env vars are present (never their values).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const required = [
    "NEXTAUTH_SECRET",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_SERVICE_ACCOUNT_EMAIL",
    "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
    "DATABASE_URL",
  ];

  const missing = required.filter((name) => !process.env[name]);

  return NextResponse.json(
    { ok: missing.length === 0, missingEnv: missing },
    { status: missing.length === 0 ? 200 : 503 }
  );
}
