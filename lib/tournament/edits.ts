import { matchStatus } from "./resolve";
import type { Match, TournamentSettings, TournamentState } from "./types";

/** Campos de um jogo que o admin pode editar. */
export type EditableField = "stage" | "home" | "away" | "homeScore" | "awayScore" | "tiebreakWinner" | "time" | "status";

/** "Finais" designa a fase final; qualquer outro valor é a chave de um grupo. */
export const FINALS = "Finais";

/**
 * Uma alteração do admin ainda por publicar. As alterações guardam-se em vez de uma
 * cópia do torneio, para se poderem aplicar por cima da versão mais recente:
 * assim um admin não apaga o que outro publicou entretanto noutros jogos.
 */
export type Edit =
  | { type: "update"; matchId: string; field: EditableField; from: string; to: string }
  | { type: "add"; modality: string; group: string; match: Match }
  | { type: "delete"; matchId: string }
  /** Nome, edição ou título do torneio. */
  | { type: "settings"; field: keyof TournamentSettings; from: string; to: string }
  /** Lista de equipas de um grupo, pela ordem de cabeça de série. */
  | { type: "teams"; modality: string; group: string; from: string[]; to: string[] }
  /** Equipas da fase final de uma modalidade sem grupos, pela ordem de cabeça de série. */
  | { type: "finalsTeams"; modality: string; from: string[]; to: string[] }
  /** Muda o nome de uma equipa nos grupos e em todos os jogos da modalidade. */
  | { type: "renameTeam"; modality: string; from: string; to: string }
  /**
   * Substitui os jogos de um grupo ou da fase final (quadro gerado). from = ids que lá
   * estavam: se entretanto mudaram, ou algum jogo começou, a substituição não se faz.
   */
  | { type: "replaceMatches"; modality: string; group: string; from: string[]; matches: Match[] }
  | { type: "addGroup"; modality: string; group: string }
  | { type: "removeGroup"; modality: string; group: string }
  | { type: "addModality"; modality: string; groups: string[] }
  | { type: "removeModality"; modality: string };

/** Uma alteração que não se aplicou como esperado ao publicar. */
export interface EditConflict {
  edit: Edit;
  /**
   * missing: o que se alterava já não existe; changed: outro admin mudou o mesmo valor
   * (ficou o deste admin); stale: outro admin mudou o que esta alteração pressupunha,
   * por isso não se aplicou (por exemplo, um jogo do grupo começou entretanto).
   */
  reason: "missing" | "changed" | "stale";
  /** Valor que estava publicado, quando reason é "changed". */
  current?: string;
}

/** Lista de jogos de um grupo ou da fase final, criando-a se ainda não existir. */
function listFor(state: TournamentState, modality: string, group: string): Match[] {
  if (group === FINALS) {
    state.finals[modality] ??= [];
    return state.finals[modality];
  }
  state.groups[modality] ??= {};
  state.groups[modality][group] ??= { matches: [] };
  return state.groups[modality][group].matches;
}

function allLists(state: TournamentState): Match[][] {
  return [
    ...Object.values(state.groups ?? {}).flatMap((groups) => Object.values(groups).map((g) => g.matches)),
    ...Object.values(state.finals ?? {}),
  ];
}

function modalityLists(state: TournamentState, modality: string): Match[][] {
  return [
    ...Object.values(state.groups?.[modality] ?? {}).map((g) => g.matches),
    state.finals?.[modality] ?? [],
  ];
}

function findMatch(state: TournamentState, matchId: string): Match | undefined {
  for (const list of allLists(state)) {
    const match = list.find((m) => m.id === matchId);
    if (match) return match;
  }
  return undefined;
}

/** true se algum jogo da lista já começou ou terminou. */
export function anyStarted(matches: Match[]): boolean {
  return matches.some((m) => matchStatus(m) !== "upcoming");
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const groupKey = (e: { modality: string; group: string }) => `${e.modality}\u0000${e.group}`;

/**
 * Junta uma alteração à lista. Duas edições do mesmo valor ficam numa só (mantém o
 * "from" original); voltar ao valor original remove a edição; apagar o que foi criado
 * neste rascunho remove-o sem deixar rasto.
 */
export function addEdit(edits: Edit[], edit: Edit): Edit[] {
  if (edit.type === "update") {
    const added = edits.find((e) => e.type === "add" && e.match.id === edit.matchId);
    if (added && added.type === "add") {
      return edits.map((e) => (e === added ? { ...added, match: { ...added.match, [edit.field]: edit.to } } : e));
    }
    const replaced = edits.find((e) => e.type === "replaceMatches" && e.matches.some((m) => m.id === edit.matchId));
    if (replaced && replaced.type === "replaceMatches") {
      const matches = replaced.matches.map((m) => (m.id === edit.matchId ? { ...m, [edit.field]: edit.to } : m));
      return edits.map((e) => (e === replaced ? { ...replaced, matches } : e));
    }
    const previous = edits.find((e) => e.type === "update" && e.matchId === edit.matchId && e.field === edit.field);
    const from = previous && previous.type === "update" ? previous.from : edit.from;
    const rest = edits.filter((e) => e !== previous);
    return from === edit.to ? rest : [...rest, { ...edit, from }];
  }

  if (edit.type === "delete") {
    const wasAdded = edits.some((e) => e.type === "add" && e.match.id === edit.matchId);
    const rest = edits.filter(
      (e) => !(e.type === "update" && e.matchId === edit.matchId) && !(e.type === "add" && e.match.id === edit.matchId),
    );
    return wasAdded ? rest : [...rest, edit];
  }

  if (edit.type === "settings") {
    const previous = edits.find((e) => e.type === "settings" && e.field === edit.field);
    const from = previous && previous.type === "settings" ? previous.from : edit.from;
    const rest = edits.filter((e) => e !== previous);
    return from === edit.to ? rest : [...rest, { ...edit, from }];
  }

  if (edit.type === "teams") {
    const previous = edits.find((e) => e.type === "teams" && groupKey(e) === groupKey(edit));
    const from = previous && previous.type === "teams" ? previous.from : edit.from;
    const rest = edits.filter((e) => e !== previous);
    return same(from, edit.to) ? rest : [...rest, { ...edit, from }];
  }

  if (edit.type === "finalsTeams") {
    const previous = edits.find((e) => e.type === "finalsTeams" && e.modality === edit.modality);
    const from = previous && previous.type === "finalsTeams" ? previous.from : edit.from;
    const rest = edits.filter((e) => e !== previous);
    return same(from, edit.to) ? rest : [...rest, { ...edit, from }];
  }

  if (edit.type === "replaceMatches") {
    const previous = edits.find((e) => e.type === "replaceMatches" && groupKey(e) === groupKey(edit));
    const from = previous && previous.type === "replaceMatches" ? previous.from : edit.from;
    // As edições aos jogos antigos deste grupo deixam de fazer sentido.
    const replacedIds = new Set(from);
    const rest = edits.filter(
      (e) =>
        e !== previous &&
        !((e.type === "update" || e.type === "delete") && replacedIds.has(e.matchId)) &&
        !(e.type === "add" && groupKey(e) === groupKey(edit)),
    );
    return [...rest, { ...edit, from }];
  }

  if (edit.type === "removeGroup") {
    const added = edits.find((e) => e.type === "addGroup" && groupKey(e) === groupKey(edit));
    if (added) {
      return edits.filter((e) => e !== added && !("group" in e && "modality" in e && groupKey(e) === groupKey(edit)));
    }
  }

  if (edit.type === "removeModality") {
    const added = edits.find((e) => e.type === "addModality" && e.modality === edit.modality);
    if (added) return edits.filter((e) => !("modality" in e && e.modality === edit.modality));
  }

  return [...edits, edit];
}

/**
 * Aplica as alterações a uma cópia do torneio. Não altera o estado recebido.
 * Devolve também os conflitos, para o admin saber o que mudou entretanto.
 */
export function applyEdits(state: TournamentState, edits: Edit[]): { state: TournamentState; conflicts: EditConflict[] } {
  const next: TournamentState = structuredClone(state);
  next.groups ??= {};
  next.finals ??= {};
  next.modalities ??= [];
  const conflicts: EditConflict[] = [];

  for (const edit of edits) {
    switch (edit.type) {
      case "add": {
        const list = listFor(next, edit.modality, edit.group);
        if (!list.some((m) => m.id === edit.match.id)) list.push(structuredClone(edit.match));
        break;
      }

      case "delete": {
        const owner = allLists(next).find((list) => list.some((m) => m.id === edit.matchId));
        if (!owner) {
          conflicts.push({ edit, reason: "missing" });
          break;
        }
        owner.splice(owner.findIndex((m) => m.id === edit.matchId), 1);
        break;
      }

      case "update": {
        const match = findMatch(next, edit.matchId);
        if (!match) {
          conflicts.push({ edit, reason: "missing" });
          break;
        }
        const current = match[edit.field] ?? "";
        if (current !== edit.from && current !== edit.to) conflicts.push({ edit, reason: "changed", current });
        match[edit.field] = edit.to;
        break;
      }

      case "settings": {
        next.settings ??= {};
        const current = next.settings[edit.field] ?? "";
        if (current !== edit.from && current !== edit.to) conflicts.push({ edit, reason: "changed", current });
        next.settings[edit.field] = edit.to;
        break;
      }

      case "teams": {
        const group = next.groups[edit.modality]?.[edit.group];
        if (!group) {
          conflicts.push({ edit, reason: "missing" });
          break;
        }
        const current = group.teams ?? [];
        if (!same(current, edit.from) && !same(current, edit.to)) {
          conflicts.push({ edit, reason: "changed", current: current.join(", ") });
        }
        group.teams = [...edit.to];
        break;
      }

      case "finalsTeams": {
        next.finalsTeams ??= {};
        const current = next.finalsTeams[edit.modality] ?? [];
        if (!same(current, edit.from) && !same(current, edit.to)) {
          conflicts.push({ edit, reason: "changed", current: current.join(", ") });
        }
        next.finalsTeams[edit.modality] = [...edit.to];
        break;
      }

      case "renameTeam": {
        let found = false;
        for (const g of Object.values(next.groups[edit.modality] ?? {})) {
          if (g.teams?.includes(edit.from)) {
            g.teams = g.teams.map((t) => (t === edit.from ? edit.to : t));
            found = true;
          }
        }
        const finalsTeams = next.finalsTeams?.[edit.modality];
        if (finalsTeams?.includes(edit.from)) {
          next.finalsTeams![edit.modality] = finalsTeams.map((t) => (t === edit.from ? edit.to : t));
          found = true;
        }
        for (const list of modalityLists(next, edit.modality)) {
          for (const m of list) {
            for (const field of ["home", "away", "tiebreakWinner"] as const) {
              if (m[field] === edit.from) {
                m[field] = edit.to;
                found = true;
              }
            }
          }
        }
        if (!found) conflicts.push({ edit, reason: "missing" });
        break;
      }

      case "replaceMatches": {
        const list = listFor(next, edit.modality, edit.group);
        if (!same(list.map((m) => m.id), edit.from) || anyStarted(list)) {
          conflicts.push({ edit, reason: "stale" });
          break;
        }
        list.splice(0, list.length, ...structuredClone(edit.matches));
        break;
      }

      case "addGroup": {
        next.groups[edit.modality] ??= {};
        next.groups[edit.modality][edit.group] ??= { teams: [], matches: [] };
        break;
      }

      case "removeGroup": {
        const group = next.groups[edit.modality]?.[edit.group];
        if (!group) {
          conflicts.push({ edit, reason: "missing" });
          break;
        }
        if (anyStarted(group.matches)) {
          conflicts.push({ edit, reason: "stale" });
          break;
        }
        delete next.groups[edit.modality][edit.group];
        break;
      }

      case "addModality": {
        if (!next.modalities.includes(edit.modality)) next.modalities.push(edit.modality);
        next.groups[edit.modality] ??= Object.fromEntries(edit.groups.map((g) => [g, { teams: [], matches: [] }]));
        next.finals[edit.modality] ??= [];
        break;
      }

      case "removeModality": {
        if (!next.modalities.includes(edit.modality)) {
          conflicts.push({ edit, reason: "missing" });
          break;
        }
        if (modalityLists(next, edit.modality).some(anyStarted)) {
          conflicts.push({ edit, reason: "stale" });
          break;
        }
        next.modalities = next.modalities.filter((m) => m !== edit.modality);
        delete next.groups[edit.modality];
        delete next.finals[edit.modality];
        if (next.finalsTeams) delete next.finalsTeams[edit.modality];
        break;
      }
    }
  }

  return { state: next, conflicts };
}

function describeTarget(edit: Edit): string {
  switch (edit.type) {
    case "update":
    case "delete":
      return `o jogo ${edit.matchId}`;
    case "add":
      return `o jogo novo ${edit.match.id}`;
    case "settings":
      return `o campo "${edit.field}" do torneio`;
    case "teams":
      return `as equipas do Grupo ${edit.group} (${edit.modality})`;
    case "finalsTeams":
      return `as equipas da fase final (${edit.modality})`;
    case "renameTeam":
      return `a equipa "${edit.from}" (${edit.modality})`;
    case "replaceMatches":
      return edit.group === FINALS ? `a fase final de ${edit.modality}` : `os jogos do Grupo ${edit.group} (${edit.modality})`;
    case "addGroup":
    case "removeGroup":
      return `o Grupo ${edit.group} (${edit.modality})`;
    case "addModality":
    case "removeModality":
      return `a modalidade ${edit.modality}`;
  }
}

/** Frase para o admin a explicar um conflito ao publicar. */
export function conflictMessage({ edit, reason, current }: EditConflict): string {
  const target = describeTarget(edit);
  if (reason === "missing") return `Não foi aplicado: ${target} já não existe (outro admin apagou ou mudou).`;
  if (reason === "stale") return `Não foi aplicado: outro admin mexeu entretanto em ${target} ou um jogo começou. Revê e tenta de novo.`;
  return `${target}: outro admin tinha posto "${current}"; ficou o teu valor.`;
}
