// Com extensão: scripts/novo-torneio.mjs corre este ficheiro diretamente no Node.
import { generateFinals } from "./generate.ts";
import type { Match, TournamentSettings, TournamentState } from "./types";

/** Configuração de um torneio (ver tournament.config.json). */
export interface TournamentConfig {
  /** Nome da plataforma, no menu de competições. */
  platformName?: string;
  platformDescription?: string;
  /**
   * id da linha em app_state da competição criada por `npm run novo-torneio`; os
   * endereços antigos (sem /c/<id>) levam a ela. Um torneio novo precisa de um id novo.
   */
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

/** Nome, edição e título: os da base de dados (editáveis no admin) ou os da configuração. */
export function tournamentSettings(
  state: TournamentState | null | undefined,
  config: Pick<TournamentConfig, "name" | "edition" | "title">,
): Required<TournamentSettings> {
  const s = state?.settings ?? {};
  return {
    name: s.name?.trim() || config.name,
    edition: s.edition?.trim() ?? config.edition,
    title: s.title?.trim() || config.title,
  };
}

/** Fase final a partir dos vencedores dos grupos (ver generateFinals). */
export function finalsTemplate(modality: string, groups: string[]): Match[] {
  return generateFinals(modality, groups);
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
