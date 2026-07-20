import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getRequestsForUser } from "@/lib/requests";
import { REQUEST_CATEGORIES } from "@/config/sheets";

/**
 * GET /api/requests/:category
 *
 * Returns the logged-in agent's rows from the matching workflow tracker.
 * category: leases | billing | maintenance | deposits | renewals
 *
 * 200 -> RequestListResponse (see src/lib/requests.ts)
 * 401 -> not signed in
 * 404 -> unknown category
 * 502 -> Google Sheets unreachable / misconfigured
 */

const categorySchema = z.enum(REQUEST_CATEGORIES);

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { category: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const parsed = categorySchema.safeParse(params.category);
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown category" }, { status: 404 });
  }

  try {
    const data = await getRequestsForUser(parsed.data, {
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
    });
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (err) {
    console.error(`GET /api/requests/${parsed.data} failed`, err);
    return NextResponse.json(
      { error: "Could not load data from the workflow tracker. Please try again shortly." },
      { status: 502 }
    );
  }
}
