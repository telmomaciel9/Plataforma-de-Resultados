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
  /** "live" enquanto o jogo está a decorrer (o resultado pode ser parcial); "" nos outros casos. */
  status?: string;
}

export interface Group {
  teams?: string[];
  matches: Match[];
  /** Jogo que decide o vencedor do grupo. Por omissão é o último jogo da lista. */
  finalMatchId?: string;
}

export interface TournamentState {
  modalities: string[];
  groups: Record<string, Record<string, Group>>;
  finals: Record<string, Match[]>;
}
