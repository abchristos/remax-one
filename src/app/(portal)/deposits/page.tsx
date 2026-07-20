import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My Deposit Payouts" };

export default function DepositsPage() {
  return (
    <RequestsView
      category="deposits"
      title="My Deposit Payouts"
      description="All your current and previous deposit payout requests, live from the workflow tracker."
    />
  );
}
