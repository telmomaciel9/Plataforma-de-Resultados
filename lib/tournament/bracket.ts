import { FINALS } from "./edits";
import { groupFinal, groupWinner, isPlaceholder, matchStatus, resolveTournament, winnerOf } from "./resolve";
import type { Match, TournamentState } from "./types";

export interface BracketNode {
  /** Jogo com as referências resolvidas. */
  match: Match;
  /** Jogos de onde vêm as equipas, pela ordem dos lados (casa primeiro). */
  children: BracketNode[];
  /** De onde vem cada lado quando não vem de um jogo deste quadro, por exemplo "1.º Grupo A". */
  origins: { home?: string; away?: string };
}

export interface Bracket {
  /** Último jogo do quadro (final do grupo ou final do torneio); null se não houver jogos. */
  root: BracketNode | null;
  /** Jogos que não fazem parte da árvore, como o 3.º/4.º lugar (sem filhos). */
  others: BracketNode[];
}

type Side = "home" | "away";

/**
 * Quadro em árvore de um grupo ou da fase final (group = FINALS).
 * As ligações vêm das referências (WIN:) ou, quando os nomes foram escritos à mão,
 * deduzem-se: uma equipa vem do último jogo anterior da mesma lista que ganhou.
 */
export function buildBracket(state: TournamentState, modality: string, group: string): Bracket {
  const raw = group === FINALS ? state.finals?.[modality] ?? [] : state.groups?.[modality]?.[group]?.matches ?? [];
  if (!raw.length) return { root: null, others: [] };

  const resolvedTournament = resolveTournament(state);
  const resolved = group === FINALS
    ? resolvedTournament.finals[modality]
    : resolvedTournament.groups[modality][group].matches;
  const index = new Map(raw.map((m, i) => [m.id, i]));
  const winners = resolved.map((m) => (matchStatus(m) === "played" ? winnerOf(m) : null));

  // Vencedor de cada grupo, para identificar as equipas que chegam à fase final.
  const groupOf = new Map<string, string>();
  if (group === FINALS) {
    for (const g of Object.keys(state.groups?.[modality] ?? {})) {
      const winner = groupWinner(state, modality, g);
      if (winner) groupOf.set(winner, g);
    }
  }

  const feeders: (number | null)[][] = raw.map(() => [null, null]);
  const origins: { home?: string; away?: string }[] = raw.map(() => ({}));
  const claimed = new Set<number>();

  raw.forEach((match, i) => {
    (["home", "away"] as Side[]).forEach((side, s) => {
      const slot = match[side];
      if (isPlaceholder(slot)) {
        const [kind, ...rest] = slot.split(":");
        const ref = index.get(rest.join(":"));
        if (kind === "WIN" && ref !== undefined && !claimed.has(ref)) {
          feeders[i][s] = ref;
          claimed.add(ref);
        } else if (kind === "WIN_GROUP") {
          origins[i][side] = `1.º Grupo ${rest[1]}`;
        } else if (kind === "LOSS" && ref !== undefined) {
          origins[i][side] = `Derrotado: ${raw[ref].stage || raw[ref].id}`;
        }
        return;
      }
      const team = resolved[i][side];
      for (let j = i - 1; j >= 0; j--) {
        if (!claimed.has(j) && winners[j] === team) {
          feeders[i][s] = j;
          claimed.add(j);
          return;
        }
      }
      // Escrito à mão no 3.º/4.º lugar: vem de ter perdido um jogo anterior.
      for (let j = i - 1; j >= 0; j--) {
        const loser = winners[j] && (winners[j] === resolved[j].home ? resolved[j].away : resolved[j].home);
        if (loser === team) {
          origins[i][side] = `Derrotado: ${resolved[j].stage || resolved[j].id}`;
          return;
        }
      }
      if (groupOf.has(team)) origins[i][side] = `1.º Grupo ${groupOf.get(team)}`;
    });
  });

  const build = (i: number): BracketNode => ({
    match: resolved[i],
    children: feeders[i].filter((f): f is number => f !== null).map(build),
    origins: origins[i],
  });
  const size = (i: number): number => 1 + feeders[i].reduce<number>((n, f) => n + (f === null ? 0 : size(f)), 0);

  let rootIndex: number;
  const declaredFinal = group === FINALS ? undefined : groupFinal(state.groups[modality][group]);
  if (declaredFinal && index.has(declaredFinal.id)) {
    rootIndex = index.get(declaredFinal.id)!;
  } else {
    // Fase final: o jogo que não alimenta nenhum outro e tem a maior árvore (em empate, o último).
    rootIndex = -1;
    raw.forEach((_, i) => {
      if (claimed.has(i)) return;
      if (rootIndex === -1 || size(i) >= size(rootIndex)) rootIndex = i;
    });
  }

  const inTree = new Set<number>();
  const mark = (i: number) => { inTree.add(i); feeders[i].forEach((f) => f !== null && mark(f)); };
  mark(rootIndex);

  return {
    root: build(rootIndex),
    others: resolved.flatMap((m, i) => (inTree.has(i) ? [] : [{ match: m, children: [], origins: origins[i] }])),
  };
}

/** Escolhas de uma simulação: para cada jogo por terminar, o lado que ganha. */
export type SimulationPicks = Record<string, Side>;

/**
 * Aplica uma simulação: os jogos escolhidos passam a terminados com 1–0 para o lado
 * escolhido, para se ver quem avançaria. Jogos que já terminaram a sério ficam como estão.
 * Não altera o estado recebido.
 */
export function simulate(state: TournamentState, picks: SimulationPicks): { state: TournamentState; simulated: Set<string> } {
  const next: TournamentState = structuredClone(state);
  const simulated = new Set<string>();
  const all = [
    ...Object.values(next.groups ?? {}).flatMap((groups) => Object.values(groups).flatMap((g) => g.matches)),
    ...Object.values(next.finals ?? {}).flat(),
  ];
  for (const match of all) {
    const side = picks[match.id];
    if (!side || matchStatus(match) === "played") continue;
    match.homeScore = side === "home" ? "1" : "0";
    match.awayScore = side === "home" ? "0" : "1";
    match.tiebreakWinner = "";
    match.status = "finished";
    simulated.add(match.id);
  }
  return { state: next, simulated };
}
