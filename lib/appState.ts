import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Snapshot, Store, TournamentState } from "@/lib/tournament";
import config from "@/tournament.config.json";

export const STATE_ROW_ID = config.id;

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
export async function loadAppState(): Promise<Snapshot> {
  const { data, error } = await supabase.from("app_state").select("*").eq("id", STATE_ROW_ID).single<AppStateRow>();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Torneio não encontrado.");
  return { state: data.payload, version: data.version ?? null };
}

async function saveAppState(state: TournamentState, expectedVersion: number | null): Promise<boolean> {
  let query = supabase.from("app_state").update({ payload: state }).eq("id", STATE_ROW_ID);
  if (expectedVersion !== null) query = query.eq("version", expectedVersion);
  const { data, error } = await query.select("id");
  if (error) throw new Error(error.message);
  if (data.length > 0) return true;

  // Nenhuma linha gravada: ou outra pessoa gravou entretanto (a versão mudou),
  // ou a RLS não deixou gravar. Com a RLS o Supabase não devolve erro, por isso
  // é preciso ver qual dos dois foi.
  const latest = await loadAppState();
  if (expectedVersion === null || latest.version === expectedVersion) {
    throw new Error("Sem permissão para gravar. Confirma que tens sessão iniciada como admin.");
  }
  return false;
}

export const appStateStore: Store = { load: loadAppState, save: saveAppState };

/**
 * Avisa sempre que a linha do torneio muda na base de dados.
 * onStatus recebe true enquanto a ligação em tempo real estiver ativa.
 */
export function subscribeToAppState(
  onChange: (snapshot: Snapshot) => void,
  onStatus: (live: boolean) => void,
): () => void {
  const channel = supabase
    .channel("app_state")
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "app_state", filter: `id=eq.${STATE_ROW_ID}` },
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
