import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import PortalShell from "@/components/PortalShell";

/**
 * Every page inside the (portal) group requires a session. Middleware
 * already guards these routes; this is defence in depth.
 */
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  return (
    <PortalShell
      user={{
        name: session.user.name ?? session.user.email,
        email: session.user.email,
        image: session.user.image,
        isAdmin: session.user.role === "ADMIN",
      }}
    >
      {children}
    </PortalShell>
  );
}
