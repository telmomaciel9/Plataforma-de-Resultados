import { applyEdits, type Edit, type EditConflict } from "./edits";
import type { TournamentState } from "./types";

export interface Snapshot {
  state: TournamentState;
  /** Versão da linha em app_state; null se a base de dados ainda não tiver a coluna version. */
  version: number | null;
}

export interface Store {
  load(): Promise<Snapshot>;
  /** Grava só se a versão ainda for expectedVersion. Devolve false se outra pessoa gravou entretanto. */
  save(state: TournamentState, expectedVersion: number | null): Promise<boolean>;
}

export type PublishResult =
  | { ok: true; state: TournamentState; conflicts: EditConflict[]; attempts: number }
  | { ok: false; reason: "busy"; attempts: number };

/**
 * Publica as alterações por cima da versão mais recente: lê, aplica, e grava só se
 * ninguém tiver gravado entretanto. Se alguém gravou, repete com os dados novos.
 * Erros de rede ou de permissões vêm como exceção de load/save.
 */
export async function publishEdits(store: Store, edits: Edit[], maxAttempts = 3): Promise<PublishResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const latest = await store.load();
    const { state, conflicts } = applyEdits(latest.state, edits);
    if (await store.save(state, latest.version)) return { ok: true, state, conflicts, attempts: attempt };
  }
  return { ok: false, reason: "busy", attempts: maxAttempts };
}
