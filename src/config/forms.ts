/**
 * The six "Submit ..." tiles on the dashboard. Each opens the existing
 * Google Form in a new tab, so the current Apps Script automations
 * (Drive folder creation, tracker spreadsheet rows) keep working unchanged.
 */
export interface SubmitForm {
  key: string;
  title: string;
  description: string;
  url: string;
  /** lucide-react icon name resolved in the SubmitTile component */
  icon: "file-signature" | "receipt" | "refresh" | "banknote" | "wrench" | "rabbit";
}

export const SUBMIT_FORMS: SubmitForm[] = [
  {
    key: "new-lease",
    title: "Submit New Lease",
    description: "Load a new lease with documents",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfyf5xaHyKTt454gizqyxA7di20mMOVRVBeIWIVK_-aFiWAGQ/viewform",
    icon: "file-signature",
  },
  {
    key: "billing",
    title: "Submit Billing",
    description: "Send a billing instruction",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSfD_Ib2iScclHFicA-aSsCMCxteSV4vuBSdG645JapX1UuyIg/viewform",
    icon: "receipt",
  },
  {
    key: "lease-renewal",
    title: "Submit Lease Renewal",
    description: "Request a lease renewal",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScZicz3emT4GkkMIrp6QMr-ADVcDWxkRDs3crkye0AKLH4vlA/viewform",
    icon: "refresh",
  },
  {
    key: "deposit-payout",
    title: "Submit Deposit Payout Request",
    description: "Request a tenant deposit payout",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSf1-GgmXPjPW99j_LE1-N6g61F-6C9i-_-ENCXs8NDrX8TNpg/viewform",
    icon: "banknote",
  },
  {
    key: "maintenance",
    title: "Submit Maintenance",
    description: "Log a maintenance request",
    url: "https://docs.google.com/forms/d/e/1FAIpQLSesoQuleQqUR9lujO9-R6-1x1q8EV7Sj-PZuz3JSPiQAK42ow/viewform",
    icon: "wrench",
  },
  {
    key: "redrabbit",
    title: "Submit RedRabbit Profile Request",
    description: "Request a RedRabbit profile",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScC6C2N8YiYfOybwyVIQn5k5WymSBf0pH-Qr8T1abz1Y6jxhg/viewform",
    icon: "rabbit",
  },
];
