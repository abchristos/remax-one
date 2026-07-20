import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My Leases" };

export default function LeasesPage() {
  return (
    <RequestsView
      category="leases"
      title="My Leases"
      description="All your current and previous leases, live from the workflow tracker."
    />
  );
}
