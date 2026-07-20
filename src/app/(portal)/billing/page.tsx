import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My Billing" };

export default function BillingPage() {
  return (
    <RequestsView
      category="billing"
      title="My Billing"
      description="All your current and previous billing instructions, live from the workflow tracker."
    />
  );
}
