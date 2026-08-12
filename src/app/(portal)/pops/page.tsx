import RequestsView from "@/components/RequestsView";

export const metadata = { title: "My POPs" };

export default function PopsPage() {
  return (
    <RequestsView
      category="pops"
      title="My POPs"
      description="Every proof of payment you have sent through, live from the POP tracker."
    />
  );
}
