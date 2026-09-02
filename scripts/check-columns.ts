/**
 * Checks for src/lib/columns.ts - the header parsing that decides which rows
 * of the Queries and POP sheets belong to the signed-in agent.
 *
 * Getting this wrong shows one agent another agent's rows, so run it after any
 * change to that file:  npm run check:columns
 */
import { deriveColumns, detectAgentColumn, agentModeForIndex } from "../src/lib/columns";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.log(`FAIL  ${label}\n      got      ${a}\n      expected ${e}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

// The real Queries form, plus plausible admin columns appended.
const queriesHeader = [
  "Timestamp",
  "Name of Agent",
  "Agent email address",
  "Property Name / Address",
  "Please describe your query below",
  "Admin",
  "Query Status",
  "",
  "",
];

const q = detectAgentColumn(queriesHeader);
check("queries: matches on the email column (C)", q, { index: 2, mode: "email" });

check(
  "queries: email column hidden, kinds inferred, property is primary",
  deriveColumns(queriesHeader, q!.index).map((c) => [c.label, c.kind, c.index, !!c.primary]),
  [
    ["Timestamp", "date", 0, false],
    ["Name of Agent", "text", 1, false],
    ["Property Name / Address", "text", 3, true],
    ["Please describe your query below", "notes", 4, false],
    ["Admin", "text", 5, false],
    ["Query Status", "status", 6, false],
  ]
);

// A POP-shaped sheet with no email column at all -> name matching.
const popHeader = ["Timestamp", "Agent Name", "Property", "Amount Paid", "Date Received", "Status"];
check("pops (name only): falls back to the agent name column", detectAgentColumn(popHeader), {
  index: 1,
  mode: "name",
});
check(
  "pops: primary skips the date and the agent column",
  deriveColumns(popHeader, 1).find((c) => c.primary)?.label,
  "Property"
);

// Google's collected-email column, no "agent" wording.
check("collected email column still wins", detectAgentColumn(["Timestamp", "Email Address", "Property"]), {
  index: 1,
  mode: "email",
});

// THE SAFETY CASE: nothing identifies an agent.
check("no agent column -> null (fails closed)", detectAgentColumn(["Timestamp", "Property", "Amount"]), null);
check("blank header -> null (fails closed)", detectAgentColumn(["", "", ""]), null);

// Env override pinning.
check("pinned column reads as email when the header says so", agentModeForIndex(queriesHeader, 2), "email");
check("pinned column reads as name otherwise", agentModeForIndex(queriesHeader, 1), "name");

// Duplicate + blank headers must not collide or produce empty keys.
const messy = ["Timestamp", "Status", "Status", "", "Notes"];
const keys = deriveColumns(messy, null).map((c) => c.key);
check("duplicate headers get unique keys, blanks dropped", keys, [
  "timestamp",
  "status",
  "status-2",
  "notes",
]);


// ---------------------------------------------------------------------------
// The REAL layouts, confirmed by the client on 2026-09-02. These are the ones
// that matter: if a change makes the app pick a different column for one of
// these sheets, agents stop seeing their own rows.
// ---------------------------------------------------------------------------

const REAL_QUERIES = ["Timestamp", "Agent", "Property", "Query", "Admin", "Status", "Feedback"];
check("REAL queries sheet: agent is column B, matched by name", detectAgentColumn(REAL_QUERIES), {
  index: 1,
  mode: "name",
});
check(
  "REAL queries sheet: Property is the card title",
  deriveColumns(REAL_QUERIES, 1).find((c) => c.primary)?.label,
  "Property"
);

const REAL_POPS = ["Timestamp", "Agent", "Property", "Admin", "Status", "Notes"];
check("REAL POP sheet: agent is column B, matched by name", detectAgentColumn(REAL_POPS), {
  index: 1,
  mode: "name",
});

// Maintenance is one of the five hand-configured trackers, so its agent column
// is not detected - but the client's headers confirm the built-in "B" is right.
const REAL_MAINTENANCE = ["Timestamp", "Name of Agent", "Property", "Admin", "Status", "Notes"];
check("REAL maintenance sheet: column B really is the agent", REAL_MAINTENANCE[1], "Name of Agent");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
