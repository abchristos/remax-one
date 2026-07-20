import { redirect } from "next/navigation";

/** Root URL: middleware guarantees a session, so go straight to the portal. */
export default function Home() {
  redirect("/dashboard");
}
