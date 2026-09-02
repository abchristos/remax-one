"use server";

import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/agent-match";

/**
 * Admin actions for the Agents page. Every action re-checks the session:
 * server actions are callable over HTTP, so the page's own guard is not
 * enough on its own.
 */

async function requireAdmin(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN" || !session.user.email) {
    throw new Error("Not allowed");
  }
  return session.user.email.toLowerCase();
}

function back(outcome: string): never {
  redirect(`/agents?${outcome}`);
}

export async function addAlias(formData: FormData) {
  const adminEmail = await requireAdmin();

  const agentId = String(formData.get("agentId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  // The matcher ignores names shorter than 3 characters, so an alias that
  // short would silently never match - better to refuse it here.
  if (!agentId || normalizeName(name).length < 3) back("error=too-short");

  try {
    await prisma.agentAlias.create({ data: { agentId, name } });
    await prisma.auditLog.create({
      data: { email: adminEmail, action: "ALIAS_ADD", detail: `${agentId}: ${name}` },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      back("error=duplicate");
    }
    console.error("addAlias failed", err);
    back("error=failed");
  }

  revalidatePath("/agents");
  back("saved=1");
}

export async function removeAlias(formData: FormData) {
  const adminEmail = await requireAdmin();
  const aliasId = String(formData.get("aliasId") ?? "");
  if (!aliasId) back("error=failed");

  try {
    const alias = await prisma.agentAlias.delete({ where: { id: aliasId } });
    await prisma.auditLog.create({
      data: { email: adminEmail, action: "ALIAS_REMOVE", detail: `${alias.agentId}: ${alias.name}` },
    });
  } catch (err) {
    console.error("removeAlias failed", err);
    back("error=failed");
  }

  revalidatePath("/agents");
  back("saved=1");
}
