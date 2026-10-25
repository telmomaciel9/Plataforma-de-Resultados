import type { Match, TournamentState } from "./types";

/** Campos de um jogo que o admin pode editar. */
export type EditableField = "stage" | "home" | "away" | "homeScore" | "awayScore" | "tiebreakWinner";

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
  | { type: "delete"; matchId: string };

/** Uma alteração que não se aplicou como esperado ao publicar. */
export interface EditConflict {
  edit: Edit;
  /** missing: o jogo já não existe; changed: outro admin mudou o mesmo campo (ficou o valor deste admin). */
  reason: "missing" | "changed";
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

function findMatch(state: TournamentState, matchId: string): Match | undefined {
  for (const list of allLists(state)) {
    const match = list.find((m) => m.id === matchId);
    if (match) return match;
  }
  return undefined;
}

/**
 * Junta uma alteração à lista. Duas edições do mesmo campo do mesmo jogo ficam numa só
 * (mantém o "from" original); voltar ao valor original remove a edição; apagar um jogo
 * criado neste rascunho remove-o sem deixar rasto.
 */
export function addEdit(edits: Edit[], edit: Edit): Edit[] {
  if (edit.type === "update") {
    const added = edits.find((e) => e.type === "add" && e.match.id === edit.matchId);
    if (added && added.type === "add") {
      return edits.map((e) => (e === added ? { ...added, match: { ...added.match, [edit.field]: edit.to } } : e));
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
  const conflicts: EditConflict[] = [];

  for (const edit of edits) {
    if (edit.type === "add") {
      const list = listFor(next, edit.modality, edit.group);
      if (!list.some((m) => m.id === edit.match.id)) list.push(structuredClone(edit.match));
      continue;
    }

    if (edit.type === "delete") {
      const owner = allLists(next).find((list) => list.some((m) => m.id === edit.matchId));
      if (!owner) {
        conflicts.push({ edit, reason: "missing" });
        continue;
      }
      owner.splice(owner.findIndex((m) => m.id === edit.matchId), 1);
      continue;
    }

    const match = findMatch(next, edit.matchId);
    if (!match) {
      conflicts.push({ edit, reason: "missing" });
      continue;
    }
    const current = match[edit.field] ?? "";
    if (current !== edit.from && current !== edit.to) conflicts.push({ edit, reason: "changed", current });
    match[edit.field] = edit.to;
  }

  return { state: next, conflicts };
}
