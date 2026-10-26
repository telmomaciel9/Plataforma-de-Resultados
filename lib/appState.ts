import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Snapshot, Store, TournamentSettings, TournamentState } from "@/lib/tournament";

// Cada competição é uma linha de app_state; o id é o endereço (/c/<id>).

export const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
);

interface AppStateRow {
  payload: TournamentState;
  version?: number | null;
}

// select("*") em vez de "payload, version": continua a funcionar antes de a coluna
// version existir (ver supabase/realtime-e-versao.sql).
export async function loadAppState(id: string): Promise<Snapshot> {
  const { data, error } = await supabase.from("app_state").select("*").eq("id", id).maybeSingle<AppStateRow>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Competição não encontrada.");
  return { state: data.payload, version: data.version ?? null };
}

/** Leitura e gravação com controlo de versão de uma competição (usado por publishEdits). */
export function competitionStore(id: string): Store {
  return {
    load: () => loadAppState(id),
    async save(state, expectedVersion) {
      let query = supabase.from("app_state").update({ payload: state }).eq("id", id);
      if (expectedVersion !== null) query = query.eq("version", expectedVersion);
      const { data, error } = await query.select("id");
      if (error) throw new Error(error.message);
      if (data.length > 0) return true;

      // Nenhuma linha gravada: ou outra pessoa gravou entretanto (a versão mudou),
      // ou a RLS não deixou gravar. Com a RLS o Supabase não devolve erro, por isso
      // é preciso ver qual dos dois foi.
      const latest = await loadAppState(id);
      if (expectedVersion === null || latest.version === expectedVersion) {
        throw new Error("Sem permissão para gravar. Confirma que tens sessão iniciada como admin.");
      }
      return false;
    },
  };
}

/**
 * Avisa sempre que a linha da competição muda na base de dados.
 * onStatus recebe true enquanto a ligação em tempo real estiver ativa.
 */
export function subscribeToAppState(
  id: string,
  onChange: (snapshot: Snapshot) => void,
  onStatus: (live: boolean) => void,
): () => void {
  const channel = supabase
    .channel(`app_state:${id}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "app_state", filter: `id=eq.${id}` },
      (change) => {
        const row = change.new as AppStateRow;
        if (row?.payload) onChange({ state: row.payload, version: row.version ?? null });
      },
    )
    .subscribe((status) => onStatus(status === "SUBSCRIBED"));
  return () => {
    supabase.removeChannel(channel);
  };
}

export interface CompetitionRow {
  id: string;
  settings: TournamentSettings | null;
  modalities: string[] | null;
  updated_at: string | null;
}

/** Lista das competições, só com o necessário para o menu (sem os jogos). */
export async function listCompetitions(): Promise<CompetitionRow[]> {
  const { data, error } = await supabase
    .from("app_state")
    .select("id, settings:payload->settings, modalities:payload->modalities, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as CompetitionRow[];
}

/** Cria uma competição nova. Falha se já existir uma com o mesmo id, ou sem permissão. */
export async function createCompetition(id: string, state: TournamentState): Promise<void> {
  const { error } = await supabase.from("app_state").insert({ id, payload: state });
  if (!error) return;
  if (error.code === "23505") throw new Error("Já existe uma competição com este endereço. Muda o nome ou a edição.");
  if (error.code === "42501") {
    throw new Error("Sem permissão para criar competições. Corre supabase/competicoes.sql no Supabase e confirma a sessão de admin.");
  }
  throw new Error(error.message);
}
