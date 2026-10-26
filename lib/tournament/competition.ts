// Com extensão: scripts/novo-torneio.mjs corre estes ficheiros diretamente no Node.
import { generateFinals } from "./generate.ts";
import type { TournamentSettings, TournamentState } from "./types";

const LETTERS = "ABCDEFGH".split("");

/** Endereço de uma competição: "Gata na Praia" + "'27" → "gata-na-praia-27". */
export function competitionId(name: string, edition: string): string {
  return `${name} ${edition}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface NewCompetition {
  name: string;
  edition: string;
  modalities: string[];
  /** Número de grupos por modalidade (1 a 8: A, B, C...). */
  groupCount: number;
}

/** Problemas no formulário de nova competição (vazio se estiver tudo bem). */
export function validateNewCompetition({ name, edition, modalities, groupCount }: NewCompetition): string[] {
  const problems: string[] = [];
  const mods = modalities.map((m) => m.trim()).filter(Boolean);
  if (!name.trim()) problems.push("Indica o nome da competição.");
  else if (!competitionId(name, edition)) problems.push("O nome tem de ter letras ou números.");
  if (!mods.length) problems.push("Indica pelo menos uma modalidade.");
  if (new Set(mods).size !== mods.length) problems.push("Há modalidades repetidas.");
  if (mods.some((m) => m.includes(":"))) problems.push("As modalidades não podem ter ':'.");
  if (!Number.isInteger(groupCount) || groupCount < 1 || groupCount > LETTERS.length) {
    problems.push(`O número de grupos tem de ser entre 1 e ${LETTERS.length}.`);
  }
  return problems;
}

/**
 * Competição nova: grupos vazios em cada modalidade e a fase final já ligada aos
 * vencedores dos grupos. As equipas e os jogos dos grupos configuram-se depois no admin.
 */
export function newCompetition(input: NewCompetition): { id: string; state: TournamentState } {
  const problems = validateNewCompetition(input);
  if (problems.length) throw new Error(problems.join(" "));
  const name = input.name.trim();
  const edition = input.edition.trim();
  const modalities = input.modalities.map((m) => m.trim()).filter(Boolean);
  const groups = LETTERS.slice(0, input.groupCount);
  const settings: TournamentSettings = { name, edition, title: [name, edition].filter(Boolean).join(" ") };
  return {
    id: competitionId(name, edition),
    state: {
      settings,
      modalities,
      groups: Object.fromEntries(modalities.map((m) => [m, Object.fromEntries(groups.map((g) => [g, { teams: [], matches: [] }]))])),
      finals: Object.fromEntries(modalities.map((m) => [m, generateFinals(m, groups)])),
    },
  };
}

export interface CompetitionSummary {
  id: string;
  name: string;
  edition: string;
  modalities: string[];
  updatedAt: Date | null;
}

/**
 * Resumo para o menu. A competição de 2026 foi criada antes de haver nome na base de
 * dados: para ela, e só para ela (o id por omissão), usa-se o nome da configuração.
 */
export function competitionSummary(
  row: { id: string; settings?: TournamentSettings | null; modalities?: string[] | null; updated_at?: string | null },
  defaults: { id: string; name: string; edition: string },
): CompetitionSummary {
  const isDefault = row.id === defaults.id;
  return {
    id: row.id,
    name: row.settings?.name?.trim() || (isDefault ? defaults.name : row.id),
    edition: row.settings?.edition?.trim() ?? (isDefault ? defaults.edition : ""),
    modalities: row.modalities ?? [],
    updatedAt: row.updated_at ? new Date(row.updated_at) : null,
  };
}
