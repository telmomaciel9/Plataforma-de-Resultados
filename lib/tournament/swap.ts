import type { Edit } from "./edits";
import { isPlaceholder, matchStatus } from "./resolve";
import type { Match, TournamentState } from "./types";

export interface SwapResult {
  edits: Edit[];
  /** Jogos por começar onde a troca se fez. */
  changedMatches: number;
  /** Jogos já começados ou terminados com uma das equipas: ficam como estão. */
  skippedMatches: number;
}

function modalityMatches(state: TournamentState, modality: string): Match[] {
  return [
    ...Object.values(state.groups?.[modality] ?? {}).flatMap((g) => g.matches),
    ...(state.finals?.[modality] ?? []),
  ];
}

/** Equipas de uma modalidade: as das listas dos grupos e as escritas nos jogos, por ordem alfabética. */
export function modalityTeams(state: TournamentState, modality: string): string[] {
  const names = new Set<string>();
  Object.values(state.groups?.[modality] ?? {}).forEach((g) => g.teams?.forEach((t) => names.add(t)));
  state.finalsTeams?.[modality]?.forEach((t) => names.add(t));
  modalityMatches(state, modality).forEach((m) =>
    [m.home, m.away].forEach((side) => side?.trim() && !isPlaceholder(side) && names.add(side)),
  );
  return [...names].sort((x, y) => x.localeCompare(y, "pt", { numeric: true, sensitivity: "base" }));
}

/**
 * Troca duas equipas de lugar numa modalidade: nos jogos por começar (onde estava uma
 * passa a estar a outra) e nas listas dos grupos (também entre grupos diferentes) e da fase final.
 * Os jogos já começados ou terminados não mudam. Devolve as alterações para o rascunho.
 */
export function swapTeams(state: TournamentState, modality: string, a: string, b: string): SwapResult {
  const edits: Edit[] = [];
  let changedMatches = 0;
  let skippedMatches = 0;
  if (!a || !b || a === b) return { edits, changedMatches, skippedMatches };
  const other = (t: string) => (t === a ? b : t === b ? a : t);

  for (const match of modalityMatches(state, modality)) {
    const involved = [match.home, match.away].some((t) => t === a || t === b);
    if (!involved) continue;
    if (matchStatus(match) !== "upcoming") {
      skippedMatches += 1;
      continue;
    }
    changedMatches += 1;
    for (const field of ["home", "away"] as const) {
      const to = other(match[field]);
      if (to !== match[field]) edits.push({ type: "update", matchId: match.id, field, from: match[field], to });
    }
  }

  for (const [group, g] of Object.entries(state.groups?.[modality] ?? {})) {
    const from = g.teams ?? [];
    const to = from.map(other);
    if (to.some((t, i) => t !== from[i])) edits.push({ type: "teams", modality, group, from, to });
  }

  const finalsFrom = state.finalsTeams?.[modality] ?? [];
  const finalsTo = finalsFrom.map(other);
  if (finalsTo.some((t, i) => t !== finalsFrom[i])) edits.push({ type: "finalsTeams", modality, from: finalsFrom, to: finalsTo });

  return { edits, changedMatches, skippedMatches };
}
