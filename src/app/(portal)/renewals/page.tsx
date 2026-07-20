import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My Renewals" };

export default function RenewalsPage() {
  return (
    <RequestsView
      category="renewals"
      title="My Renewals"
      description="All your current and previous lease renewals, live from the workflow tracker."
    />
  );
}
