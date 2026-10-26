import { FINALS } from "./edits";
import { TO_BE_DECIDED, groupFinal, hasResult, isPlaceholder, parseScore, resolveTournament, winnerOf } from "./resolve";
import type { Match, TournamentState } from "./types";

export type MatchStatus = "live" | "played" | "upcoming";

/** "live" se o admin o marcou a decorrer; "played" se tem resultado; senão "upcoming". */
export function matchStatus(match: Match): MatchStatus {
  if (match.status === "live") return "live";
  return hasResult(match) ? "played" : "upcoming";
}

/** Endereço de uma equipa: "5 - A Ganza está na Areia" → "5-a-ganza-esta-na-areia". */
export function teamSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface Team {
  name: string;
  slug: string;
  /** Modalidades em que a equipa tem jogos, pela ordem do torneio. */
  modalities: string[];
}

interface Located {
  match: Match;
  modality: string;
  /** Chave do grupo, ou FINALS. */
  group: string;
  /** Posição no torneio, para manter a ordem de quem criou os jogos. */
  order: number;
}

function locate(state: TournamentState): Located[] {
  const all: Located[] = [];
  const modalities = state.modalities?.length ? state.modalities : Object.keys({ ...state.groups, ...state.finals });
  for (const modality of modalities) {
    for (const [group, g] of Object.entries(state.groups?.[modality] ?? {})) {
      g.matches.forEach((match) => all.push({ match, modality, group, order: all.length }));
    }
    (state.finals?.[modality] ?? []).forEach((match) => all.push({ match, modality, group: FINALS, order: all.length }));
  }
  return all;
}

const isTeamName = (name: string | undefined): name is string =>
  !!name?.trim() && !isPlaceholder(name) && name !== TO_BE_DECIDED && !name.startsWith("Vencedor Grupo ");

function compareNames(a: string, b: string): number {
  return a.localeCompare(b, "pt", { numeric: true, sensitivity: "base" });
}

/** Todas as equipas do torneio (as que já aparecem num jogo ou na lista de um grupo), por ordem. */
export function allTeams(state: TournamentState): Team[] {
  const resolved = resolveTournament(state);
  const teams = new Map<string, Set<string>>();
  const add = (name: string, modality: string) => {
    if (!teams.has(name)) teams.set(name, new Set());
    teams.get(name)!.add(modality);
  };
  for (const [modality, groups] of Object.entries(resolved.groups ?? {})) {
    Object.values(groups).forEach((g) => g.teams?.forEach((t) => isTeamName(t) && add(t, modality)));
  }
  locate(resolved).forEach(({ match, modality }) =>
    [match.home, match.away].forEach((side) => isTeamName(side) && add(side, modality)),
  );
  const order = state.modalities ?? [];
  return [...teams.entries()]
    .map(([name, mods]) => ({
      name,
      slug: teamSlug(name),
      modalities: [...mods].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    }))
    .sort((a, b) => compareNames(a.name, b.name));
}

export function findTeam(state: TournamentState, slug: string): Team | undefined {
  return allTeams(state).find((t) => t.slug === slug);
}

export type Outcome = "win" | "loss" | "draw";

export interface TeamMatch {
  /** Jogo com as referências já resolvidas. */
  match: Match;
  modality: string;
  group: string;
  status: MatchStatus;
  opponent: string;
  teamScore: string;
  opponentScore: string;
  /** Só em jogos terminados. Empate só se não houver vencedor do desempate. */
  outcome?: Outcome;
  wonOnTiebreak?: boolean;
}

/** Ordena por hora quando os dois jogos a têm; senão mantém a ordem do torneio. */
function byTime(a: Located, b: Located): number {
  if (a.match.time && b.match.time && a.match.time !== b.match.time) return a.match.time < b.match.time ? -1 : 1;
  return a.order - b.order;
}

/** Jogos de uma equipa em todas as modalidades, por hora (ou pela ordem do torneio). */
export function teamMatches(state: TournamentState, teamName: string): TeamMatch[] {
  return locate(resolveTournament(state))
    .filter(({ match }) => match.home === teamName || match.away === teamName)
    .sort(byTime)
    .map(({ match, modality, group }) => {
      const isHome = match.home === teamName;
      const status = matchStatus(match);
      const winner = status === "played" ? winnerOf(match) : null;
      const draw = parseScore(match.homeScore) === parseScore(match.awayScore);
      return {
        match,
        modality,
        group,
        status,
        opponent: isHome ? match.away : match.home,
        teamScore: isHome ? match.homeScore : match.awayScore,
        opponentScore: isHome ? match.awayScore : match.homeScore,
        outcome: status !== "played" ? undefined : winner === null ? "draw" : winner === teamName ? "win" : "loss",
        wonOnTiebreak: status === "played" && draw && winner === teamName,
      };
    });
}

/** Próximo jogo: o que está a decorrer, ou o primeiro por jogar. */
export function nextMatch(matches: TeamMatch[]): TeamMatch | undefined {
  return matches.find((m) => m.status === "live") ?? matches.find((m) => m.status === "upcoming");
}

export interface Prospect {
  /** Jogo da equipa ainda por decidir. */
  from: TeamMatch;
  /** "win": se ganhar o jogo "from"; "loss": se perder. */
  condition: "win" | "loss";
  /** Jogo seguinte, com as referências resolvidas. */
  next: Match;
  /** Adversário no jogo seguinte (pode ser "Por definir"). */
  opponent: string;
}

/**
 * Para cada jogo da equipa ainda por decidir, para onde vai a seguir se ganhar ou perder:
 * jogos com WIN:/LOSS: desse jogo e, se for a final do grupo, os jogos com WIN_GROUP: desse grupo.
 */
export function prospects(state: TournamentState, teamName: string): Prospect[] {
  const pending = teamMatches(state, teamName).filter((m) => m.status !== "played");
  if (!pending.length) return [];
  const raw = locate(state);
  const resolvedById = new Map(locate(resolveTournament(state)).map((l) => [l.match.id, l.match]));
  const result: Prospect[] = [];

  for (const from of pending) {
    const id = from.match.id;
    const refs: Record<string, "win" | "loss"> = { [`WIN:${id}`]: "win", [`LOSS:${id}`]: "loss" };
    if (from.group !== FINALS) {
      const group = state.groups?.[from.modality]?.[from.group];
      if (group && groupFinal(group)?.id === id) refs[`WIN_GROUP:${from.modality}:${from.group}`] = "win";
    }
    for (const { match } of raw) {
      for (const [side, other] of [["home", "away"], ["away", "home"]] as const) {
        const condition = refs[match[side]];
        if (!condition) continue;
        const next = resolvedById.get(match.id)!;
        result.push({ from, condition, next, opponent: next[other] });
      }
    }
  }
  return result;
}
