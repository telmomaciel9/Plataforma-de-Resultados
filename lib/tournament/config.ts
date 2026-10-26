import type { TournamentSettings } from "./types";

/** Configuração da plataforma (ver tournament.config.json). */
export interface TournamentConfig {
  /** Nome da plataforma, no menu de competições. */
  platformName: string;
  platformDescription: string;
  /** Competição que os endereços antigos (sem /c/<id>) abrem: a do Gata na Praia 2026. */
  id: string;
  /** Nome, edição e título dessa competição, que foi criada antes de haver textos na base de dados. */
  name: string;
  edition: string;
  title: string;
  /** Modalidades e grupos sugeridos ao criar uma competição nova. */
  modalities: string[];
  groups: string[];
}

/** Nome, edição e título: os da base de dados (editáveis no admin) ou os da configuração. */
export function tournamentSettings(
  state: { settings?: TournamentSettings } | null | undefined,
  config: Pick<TournamentConfig, "name" | "edition" | "title">,
): Required<TournamentSettings> {
  const s = state?.settings ?? {};
  return {
    name: s.name?.trim() || config.name,
    edition: s.edition?.trim() ?? config.edition,
    title: s.title?.trim() || config.title,
  };
}
