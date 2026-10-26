// Forma do documento JSON guardado em app_state.payload.

/**
 * Um lado de um jogo. Pode ser o nome de uma equipa ("5 - A Ganza está na Areia")
 * ou uma referência que só se conhece quando outro jogo acabar:
 *   - "WIN:<id>"                  vencedor do jogo <id>
 *   - "LOSS:<id>"                 derrotado do jogo <id>
 *   - "WIN_GROUP:<modalidade>:<grupo>"  vencedor do grupo (ver groupWinner)
 */
export type Slot = string;

export interface Match {
  id: string;
  stage: string;
  home: Slot;
  away: Slot;
  /** Resultado como texto; "" quando o jogo ainda não tem resultado. */
  homeScore: string;
  awayScore: string;
  /** Equipa que ganhou o desempate (penáltis, ponto de ouro) quando o resultado é empate. */
  tiebreakWinner?: string;
  /** Hora prevista, "HH:MM". */
  time?: string;
  /**
   * Estado indicado pelo admin: "upcoming" (por começar), "live" (a decorrer, o resultado
   * pode ser parcial) ou "finished" (terminado). Vazio: terminado se tiver resultado.
   * Só um jogo terminado decide quem avança.
   */
  status?: string;
}

export interface Group {
  teams?: string[];
  matches: Match[];
  /** Jogo que decide o vencedor do grupo. Por omissão é o último jogo da lista. */
  finalMatchId?: string;
}

/** Textos do torneio editáveis no admin; os que faltam vêm de tournament.config.json. */
export interface TournamentSettings {
  name?: string;
  /** Edição mostrada a seguir ao nome, por exemplo "'27". */
  edition?: string;
  /** Título da página no browser. */
  title?: string;
}

export interface TournamentState {
  settings?: TournamentSettings;
  modalities: string[];
  groups: Record<string, Record<string, Group>>;
  finals: Record<string, Match[]>;
}
