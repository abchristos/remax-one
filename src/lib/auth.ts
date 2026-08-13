import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

/**
 * Authentication: Google Sign-In restricted to company email domains.
 *
 * - ALLOWED_EMAIL_DOMAINS controls which domains may log in.
 * - On first successful login an AgentProfile row is auto-provisioned so
 *   admins only need to add name aliases, not create accounts.
 * - Sessions are stateless JWTs (no session table needed).
 */

const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
  .split(",")
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);

/**
 * Admins by email address. Set in .env so the first admin can be appointed
 * without anyone editing the database - which otherwise leaves nobody able to
 * open the sheet-check page or see all rows.
 */
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isCompanyEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;
  if (allowedDomains.length === 0) {
    // Fail closed in production if no domains configured; allow in dev only.
    return process.env.NODE_ENV !== "production";
  }
  return allowedDomains.includes(domain);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
          // Hint Google to show only company accounts (still enforced
          // server-side in the signIn callback below).
          hd: allowedDomains[0],
        },
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12 hours
  pages: { signIn: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!isCompanyEmail(user.email)) return false;

      // Auto-provision the agent profile and record the login. A database
      // hiccup should not lock everyone out, so failures are logged only.
      try {
        const email = user.email!.toLowerCase();
        const profile = await prisma.agentProfile.upsert({
          where: { email },
          update: { fullName: user.name ?? undefined },
          create: { email, fullName: user.name ?? email },
        });
        if (!profile.active) return false; // deactivated staff member
        await prisma.auditLog.create({
          data: { email, action: "LOGIN" },
        });
      } catch (err) {
        console.error("signIn callback: database error", err);
      }
      return true;
    },
    async jwt({ token, user }) {
      // Attach the role once at sign-in time.
      if (user?.email) {
        const email = user.email.toLowerCase();
        if (adminEmails.includes(email)) {
          token.role = "ADMIN";
          return token;
        }
        try {
          const profile = await prisma.agentProfile.findUnique({
            where: { email },
          });
          token.role = profile?.role ?? "AGENT";
        } catch {
          token.role = "AGENT";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token.role as string) ?? "AGENT";
      }
      return session;
    },
  },
};
