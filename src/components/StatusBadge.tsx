/**
 * Colour-coded status pill. Colours are inferred from common tracker wording
 * so the sheet vocabulary can evolve without code changes.
 */

const GREEN = ["complete", "done", "paid", "sent", "approved", "finalised", "finalized", "signed", "captured", "active", "yes"];
const AMBER = ["pending", "awaiting", "in progress", "busy", "processing", "review", "queried", "follow up", "partial"];
const RED = ["rejected", "declined", "cancelled", "canceled", "overdue", "outstanding", "failed", "expired", "no"];

function toneFor(value: string): "green" | "amber" | "red" | "gray" {
  const v = value.toLowerCase();
  if (GREEN.some((w) => v.includes(w))) return "green";
  if (RED.some((w) => v.includes(w))) return "red";
  if (AMBER.some((w) => v.includes(w))) return "amber";
  return "gray";
}

const TONE_CLASSES = {
  green: "bg-green-50 text-green-700 border-green-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  gray: "bg-gray-50 text-gray-600 border-gray-200",
} as const;

export default function StatusBadge({ value }: { value: string }) {
  if (!value) return <span className="text-gray-300">—</span>;
  return (
    <span
      className={`inline-block max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[toneFor(value)]}`}
      title={value}
    >
      {value}
    </span>
  );
}
