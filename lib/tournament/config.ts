import type { Match, TournamentState } from "./types";

/** Configuração de um torneio (ver tournament.config.json). */
export interface TournamentConfig {
  /** id da linha em app_state. Um torneio novo precisa de um id novo. */
  id: string;
  /** Nome curto mostrado no topo da app. */
  name: string;
  /** Edição mostrada a seguir ao nome, por exemplo "'26". */
  edition: string;
  /** Título da página no browser. */
  title: string;
  description: string;
  modalities: string[];
  /** Chaves dos grupos, por ordem. */
  groups: string[];
}

/** Valida a configuração e devolve a lista de problemas (vazia se estiver tudo bem). */
export function validateConfig(config: TournamentConfig): string[] {
  const problems: string[] = [];
  if (!config.id?.trim()) problems.push("Falta o id do torneio.");
  if (!config.name?.trim()) problems.push("Falta o nome do torneio.");
  if (!config.modalities?.length) problems.push("Indica pelo menos uma modalidade.");
  if (!config.groups?.length) problems.push("Indica pelo menos um grupo.");
  const duplicated = (list: string[] = []) => list.filter((v, i) => list.indexOf(v) !== i);
  if (duplicated(config.modalities).length) problems.push(`Modalidades repetidas: ${duplicated(config.modalities).join(", ")}.`);
  if (duplicated(config.groups).length) problems.push(`Grupos repetidos: ${duplicated(config.groups).join(", ")}.`);
  if ((config.modalities ?? []).some((m) => m.includes(":"))) problems.push("Os nomes das modalidades não podem ter ':'.");
  if ((config.groups ?? []).some((g) => g.includes(":") || g === "Finais")) {
    problems.push("Os grupos não podem ter ':' nem chamar-se 'Finais'.");
  }
  return problems;
}

/** Prefixo dos ids dos jogos de uma modalidade: "Voleibol" → "VOL". */
function prefix(modality: string): string {
  const letters = modality.normalize("NFD").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return letters.slice(0, 3) || "MOD";
}

function slot(id: string, stage: string, home: string, away: string): Match {
  return { id, stage, home, away, homeScore: "", awayScore: "", tiebreakWinner: "" };
}

/**
 * Fase final a partir dos vencedores dos grupos, em eliminatória.
 * 1 grupo: sem fase final. 2 grupos: final. 4 grupos: meias, 3.º/4.º e final.
 * Outros números: meias/quartos não se geram sozinhos e os jogos criam-se no admin.
 */
export function finalsTemplate(modality: string, groups: string[]): Match[] {
  const p = prefix(modality);
  const winner = (g: string) => `WIN_GROUP:${modality}:${g}`;
  if (groups.length === 2) return [slot(`${p}-FINAL`, "Final", winner(groups[0]), winner(groups[1]))];
  if (groups.length === 4) {
    const [a, b, c, d] = groups;
    return [
      slot(`${p}-MF1`, "Meia-final", winner(a), winner(b)),
      slot(`${p}-MF2`, "Meia-final", winner(c), winner(d)),
      slot(`${p}-3LUG`, "3.º/4.º lugar", `LOSS:${p}-MF1`, `LOSS:${p}-MF2`),
      slot(`${p}-FINAL`, "Final", `WIN:${p}-MF1`, `WIN:${p}-MF2`),
    ];
  }
  return [];
}

/** Estado inicial de um torneio novo: grupos vazios e o quadro da fase final já ligado aos grupos. */
export function emptyTournament(config: TournamentConfig): TournamentState {
  const problems = validateConfig(config);
  if (problems.length) throw new Error(problems.join(" "));
  return {
    modalities: [...config.modalities],
    groups: Object.fromEntries(
      config.modalities.map((m) => [m, Object.fromEntries(config.groups.map((g) => [g, { matches: [] }]))]),
    ),
    finals: Object.fromEntries(config.modalities.map((m) => [m, finalsTemplate(m, config.groups)])),
  };
}
