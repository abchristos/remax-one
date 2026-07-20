import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SUBMIT_FORMS } from "@/config/forms";
import SubmitTile from "@/components/SubmitTile";

export const metadata = { title: "Home" };

/** Main page: greeting + the six "Submit ..." tiles. */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const firstName = session?.user?.name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-brand-secondary">Welcome, {firstName}</h1>
      <p className="mt-1 text-gray-500">
        Submit a new request below, or use the menu to track your existing requests.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SUBMIT_FORMS.map((form) => (
          <SubmitTile key={form.key} form={form} />
        ))}
      </div>
    </div>
  );
}
