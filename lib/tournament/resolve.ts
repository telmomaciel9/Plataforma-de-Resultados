import type { Group, Match, Slot, TournamentState } from "./types";

export const TO_BE_DECIDED = "Por definir";

/** Converte um resultado em número. Devolve null se estiver vazio ou não for um inteiro >= 0. */
export function parseScore(score: string | number | null | undefined): number | null {
  if (score === null || score === undefined) return null;
  const text = String(score).trim();
  if (!/^\d+$/.test(text)) return null;
  return Number(text);
}

export function hasResult(match: Match): boolean {
  return parseScore(match.homeScore) !== null && parseScore(match.awayScore) !== null;
}

/**
 * Vencedor de um jogo cujos lados já são nomes de equipas.
 * Em caso de empate usa tiebreakWinner, mas só se for uma das duas equipas.
 * Devolve null se o jogo ainda não estiver decidido.
 */
export function winnerOf(match: Match): string | null {
  const home = parseScore(match.homeScore);
  const away = parseScore(match.awayScore);
  if (home === null || away === null) return null;
  if (home > away) return match.home;
  if (away > home) return match.away;
  const tiebreak = match.tiebreakWinner;
  return tiebreak && (tiebreak === match.home || tiebreak === match.away) ? tiebreak : null;
}

export function loserOf(match: Match): string | null {
  const winner = winnerOf(match);
  if (winner === null) return null;
  return winner === match.home ? match.away : match.home;
}

export function isPlaceholder(slot: Slot): boolean {
  return typeof slot === "string" && /^(WIN|LOSS|WIN_GROUP):/.test(slot);
}

/** Jogo que decide o vencedor do grupo: finalMatchId, ou o último jogo da lista. */
export function groupFinal(group: Group): Match | undefined {
  if (group.finalMatchId) return group.matches.find((m) => m.id === group.finalMatchId);
  return group.matches[group.matches.length - 1];
}

/** Um lado resolvido: a equipa, ou null se ainda não se sabe (com o texto a mostrar). */
interface Side {
  team: string | null;
  label: string;
}

/**
 * Resolve as referências WIN:/LOSS:/WIN_GROUP: de um torneio.
 * Funciona por id, por isso a ordem dos jogos nas listas não importa.
 * Referências que ainda não se podem decidir (jogo sem resultado, id inexistente,
 * referência circular) nunca contam como equipa.
 */
function createResolver(state: TournamentState) {
  const byId = new Map<string, Match>();
  const groupFinalIds = new Map<string, string>();

  for (const [modality, groups] of Object.entries(state.groups ?? {})) {
    for (const [groupKey, group] of Object.entries(groups)) {
      group.matches.forEach((m) => byId.set(m.id, m));
      const final = groupFinal(group);
      if (final) groupFinalIds.set(`${modality}:${groupKey}`, final.id);
    }
  }
  Object.values(state.finals ?? {}).forEach((matches) => matches.forEach((m) => byId.set(m.id, m)));

  const cache = new Map<string, { home: Side; away: Side }>();
  const visiting = new Set<string>();

  function sides(id: string): { home: Side; away: Side } | null {
    const cached = cache.get(id);
    if (cached) return cached;
    const match = byId.get(id);
    if (!match || visiting.has(id)) return null;

    visiting.add(id);
    const result = { home: side(match.home), away: side(match.away) };
    visiting.delete(id);
    cache.set(id, result);
    return result;
  }

  function outcome(id: string, pick: (m: Match) => string | null): string | null {
    const s = sides(id);
    if (!s || s.home.team === null || s.away.team === null) return null;
    return pick({ ...byId.get(id)!, home: s.home.team, away: s.away.team });
  }

  function side(slot: Slot): Side {
    if (!isPlaceholder(slot)) return { team: slot, label: slot };
    const [kind, ...rest] = slot.split(":");

    if (kind === "WIN" || kind === "LOSS") {
      const team = outcome(rest.join(":"), kind === "WIN" ? winnerOf : loserOf);
      return { team, label: team ?? TO_BE_DECIDED };
    }

    // WIN_GROUP:<modalidade>:<grupo>
    const [modality, groupKey] = rest;
    const finalId = groupFinalIds.get(`${modality}:${groupKey}`);
    const team = finalId ? outcome(finalId, winnerOf) : null;
    return { team, label: team ?? `Vencedor Grupo ${groupKey}` };
  }

  return {
    match(m: Match): Match {
      const s = sides(m.id);
      if (!s) return m;
      return { ...m, home: s.home.label, away: s.away.label };
    },
    winner: (id: string) => outcome(id, winnerOf),
    groupFinalId: (modality: string, groupKey: string) => groupFinalIds.get(`${modality}:${groupKey}`),
  };
}

/**
 * Devolve uma cópia do torneio com as referências substituídas pelo nome da equipa,
 * ou por "Por definir" / "Vencedor Grupo X" enquanto não estiverem decididas.
 * Nomes escritos à mão ficam iguais. Não altera o estado recebido.
 */
export function resolveTournament(state: TournamentState): TournamentState {
  const resolver = createResolver(state);
  return {
    ...state,
    groups: Object.fromEntries(
      Object.entries(state.groups ?? {}).map(([modality, groups]) => [
        modality,
        Object.fromEntries(
          Object.entries(groups).map(([key, group]) => [
            key,
            { ...group, matches: group.matches.map(resolver.match) },
          ]),
        ),
      ]),
    ),
    finals: Object.fromEntries(
      Object.entries(state.finals ?? {}).map(([modality, matches]) => [modality, matches.map(resolver.match)]),
    ),
  };
}

/** Vencedor do grupo, ou null se a final do grupo ainda não estiver decidida. */
export function groupWinner(state: TournamentState, modality: string, groupKey: string): string | null {
  const resolver = createResolver(state);
  const finalId = resolver.groupFinalId(modality, groupKey);
  return finalId ? resolver.winner(finalId) : null;
}

/** Vencedor de qualquer jogo, resolvendo as referências. null se ainda não estiver decidido. */
export function matchWinner(state: TournamentState, matchId: string): string | null {
  return createResolver(state).winner(matchId);
}
