import { FINALS } from "./edits";
import { TO_BE_DECIDED, groupFinal, isPlaceholder, matchTeams } from "./resolve";
import type { Match, Slot, TournamentState } from "./types";

export interface SlotOption {
  /** Valor a guardar no jogo: nome da equipa ou referência (WIN:, LOSS:, WIN_GROUP:). */
  value: Slot;
  label: string;
  kind: "team" | "winner" | "loser" | "group";
}

interface Located {
  match: Match;
  /** Chave do grupo, ou FINALS. */
  group: string;
}

function matchesOfModality(state: TournamentState, modality: string): Located[] {
  const groups = Object.entries(state.groups?.[modality] ?? {}).flatMap(([group, g]) =>
    g.matches.map((match) => ({ match, group })),
  );
  const finals = (state.finals?.[modality] ?? []).map((match) => ({ match, group: FINALS }));
  return [...groups, ...finals];
}

/** Ids dos jogos de que um lado depende diretamente. */
function slotDependencies(state: TournamentState, slot: Slot): string[] {
  if (!isPlaceholder(slot)) return [];
  const [kind, ...rest] = slot.split(":");
  if (kind === "WIN" || kind === "LOSS") return [rest.join(":")];
  const [modality, group] = rest;
  const final = state.groups?.[modality]?.[group] && groupFinal(state.groups[modality][group]);
  return final ? [final.id] : [];
}

/** true se escolher este lado no jogo matchId criaria uma referência circular. */
export function createsCycle(state: TournamentState, matchId: string, slot: Slot): boolean {
  const byId = new Map<string, Match>();
  for (const modality of Object.keys({ ...state.groups, ...state.finals })) {
    matchesOfModality(state, modality).forEach(({ match }) => byId.set(match.id, match));
  }
  const seen = new Set<string>();
  const pending = slotDependencies(state, slot);
  while (pending.length) {
    const id = pending.pop()!;
    if (id === matchId) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const match = byId.get(id);
    if (match) pending.push(...slotDependencies(state, match.home), ...slotDependencies(state, match.away));
  }
  return false;
}

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "pt", { numeric: true, sensitivity: "base" });
}

function describeMatch(state: TournamentState, { match, group }: Located): string {
  const teams = matchTeams(state, match.id);
  const home = teams?.home ?? (isPlaceholder(match.home) ? TO_BE_DECIDED : match.home);
  const away = teams?.away ?? (isPlaceholder(match.away) ? TO_BE_DECIDED : match.away);
  const where = group === FINALS ? "" : `Grupo ${group} · `;
  return `${where}${match.stage || match.id} (${home} vs ${away})`;
}

/**
 * Opções para um lado do jogo matchId: as equipas da modalidade, o vencedor ou o
 * derrotado de outro jogo da mesma modalidade e o vencedor de cada grupo.
 * Deixa de fora o próprio jogo e tudo o que criaria uma referência circular.
 */
export function slotOptions(state: TournamentState, modality: string, matchId: string): SlotOption[] {
  const located = matchesOfModality(state, modality);

  const teamNames = new Set<string>();
  Object.values(state.groups?.[modality] ?? {}).forEach((g) => g.teams?.forEach((t) => teamNames.add(t)));
  state.finalsTeams?.[modality]?.forEach((t) => teamNames.add(t));
  located.forEach(({ match }) =>
    [match.home, match.away].forEach((side) => {
      if (side?.trim() && !isPlaceholder(side) && side !== TO_BE_DECIDED) teamNames.add(side);
    }),
  );
  const teams: SlotOption[] = [...teamNames].sort(compareNames).map((name) => ({ value: name, label: name, kind: "team" }));

  const allowed = (value: Slot) => !createsCycle(state, matchId, value);
  const others = located.filter(({ match }) => match.id !== matchId);
  const winners: SlotOption[] = others
    .map((l) => ({ value: `WIN:${l.match.id}`, label: `Vencedor: ${describeMatch(state, l)}`, kind: "winner" as const }))
    .filter((o) => allowed(o.value));
  const losers: SlotOption[] = others
    .map((l) => ({ value: `LOSS:${l.match.id}`, label: `Derrotado: ${describeMatch(state, l)}`, kind: "loser" as const }))
    .filter((o) => allowed(o.value));
  const groups: SlotOption[] = Object.keys(state.groups?.[modality] ?? {})
    .map((g) => ({ value: `WIN_GROUP:${modality}:${g}`, label: `Vencedor do Grupo ${g}`, kind: "group" as const }))
    .filter((o) => allowed(o.value));

  return [...teams, ...groups, ...winners, ...losers];
}
