import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My Queries" };

export default function QueriesPage() {
  return (
    <RequestsView
      category="queries"
      title="My Queries"
      description="Every query you have raised, live from the query tracker."
    />
  );
}
