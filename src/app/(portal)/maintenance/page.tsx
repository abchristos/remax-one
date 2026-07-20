import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My Maintenance" };

export default function MaintenancePage() {
  return (
    <RequestsView
      category="maintenance"
      title="My Maintenance"
      description="All your current and previous maintenance requests, live from the workflow tracker."
    />
  );
}
