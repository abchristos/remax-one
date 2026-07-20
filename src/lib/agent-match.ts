/**
 * Matching sheet rows to the logged-in user.
 *
 * Tracker sheets identify agents by NAME (typed by humans), while login is
 * by EMAIL. We match a row when its agent cell equals - or contains - any
 * known name for the user: their Google display name, their AgentProfile
 * fullName, or any admin-maintained alias.
 */

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .replace(/[^a-z0-9@.\s]/g, " ") // punctuation -> space
    .replace(/\s+/g, " ")
    .trim();
}

export type AgentMatcher = (agentCell: string | undefined) => boolean;

export function buildAgentMatcher(candidateNames: string[]): AgentMatcher {
  const names = Array.from(
    new Set(candidateNames.map(normalizeName).filter((n) => n.length >= 3))
  );

  return (agentCell) => {
    if (!agentCell) return false;
    const cell = normalizeName(agentCell);
    if (!cell) return false;
    return names.some((name) => cell === name || cell.includes(name));
  };
}

/** Matcher that accepts every row - used for ADMIN users. */
export const matchAll: AgentMatcher = () => true;
