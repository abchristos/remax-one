import {
  FileSignature,
  Receipt,
  RefreshCw,
  Banknote,
  Wrench,
  Rabbit,
  MessageSquare,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import type { SubmitForm } from "@/config/forms";

const ICONS = {
  "file-signature": FileSignature,
  receipt: Receipt,
  refresh: RefreshCw,
  banknote: Banknote,
  wrench: Wrench,
  rabbit: Rabbit,
  message: MessageSquare,
  card: CreditCard,
} as const;

/** Dashboard tile - opens the existing Google Form in a new tab. */
export default function SubmitTile({ form }: { form: SubmitForm }) {
  const Icon = ICONS[form.icon];
  return (
    <a
      href={form.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-primary hover:shadow-md"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary transition group-hover:bg-brand-primary group-hover:text-white">
        <Icon size={22} aria-hidden="true" />
      </div>
      <div>
        <p className="flex items-center gap-1.5 font-semibold text-brand-ink">
          {form.title}
          <ExternalLink
            size={13}
            className="text-gray-300 transition group-hover:text-brand-primary"
            aria-hidden="true"
          />
        </p>
        <p className="mt-0.5 text-sm text-gray-500">{form.description}</p>
      </div>
    </a>
  );
}
