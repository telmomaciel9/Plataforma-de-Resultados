import type { Match, Slot } from "./types";

/** Base dos ids dos jogos de uma modalidade: "Ténis de mesa" → "TENIS-DE-MESA". */
export function matchIdPrefix(modality: string): string {
  const slug = modality
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "MOD";
}

/** Posições das cabeças de série num quadro de `size` lugares: 8 → [1, 8, 4, 5, 2, 7, 3, 6]. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2 + 1;
    order = order.flatMap((seed) => [seed, next - seed]);
  }
  return order;
}

function nextPowerOfTwo(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

interface RoundOptions {
  /** id de um jogo a partir da ronda (1 = primeira) e do número do jogo na ronda. */
  id: (round: number, game: number, roundsLeft: number) => string;
  /** Nome da fase a partir do número de rondas que faltam (0 = último jogo). */
  stage: (round: number, game: number, roundsLeft: number, gamesInRound: number) => string;
}

/**
 * Eliminatória a partir dos lugares do quadro, pela ordem em que se defrontam
 * (lugares 1 e 2 jogam entre si, 3 e 4, ...). null é um lugar vazio: quem calha
 * contra um lugar vazio passa à ronda seguinte sem jogar.
 */
function knockout(positions: (Slot | null)[], options: RoundOptions): Match[] {
  const rounds = Math.log2(positions.length);
  const matches: Match[] = [];
  let slots = positions;
  for (let round = 1; slots.length > 1; round++) {
    const next: (Slot | null)[] = [];
    const roundsLeft = rounds - round;
    const pairs: [Slot, Slot][] = [];
    for (let i = 0; i < slots.length; i += 2) {
      const [a, b] = [slots[i], slots[i + 1]];
      if (a !== null && b !== null) pairs.push([a, b]);
    }
    let game = 0;
    for (let i = 0; i < slots.length; i += 2) {
      const [a, b] = [slots[i], slots[i + 1]];
      if (a === null || b === null) {
        next.push(a ?? b);
        continue;
      }
      game += 1;
      const id = options.id(round, game, roundsLeft);
      matches.push({
        id,
        stage: options.stage(round, game, roundsLeft, pairs.length),
        home: a,
        away: b,
        homeScore: "",
        awayScore: "",
      });
      next.push(`WIN:${id}`);
    }
    slots = next;
  }
  return matches;
}

/**
 * Eliminatória de um grupo com qualquer número de equipas (pelo menos 2). As equipas
 * vêm por ordem de cabeça de série: se o número não for potência de 2, as primeiras
 * ficam isentas da 1.ª ronda. Com 6 equipas dá o formato de 2026: dois jogos na
 * 1.ª ronda, duas meias com as cabeças de série 1 e 2, e a final do grupo.
 */
export function generateGroupMatches(modality: string, group: string, teams: string[]): Match[] {
  const names = teams.map((t) => t.trim()).filter(Boolean);
  if (names.length < 2) return [];
  const size = nextPowerOfTwo(names.length);
  const positions = seedOrder(size).map((seed) => names[seed - 1] ?? null);
  const base = `${matchIdPrefix(modality)}-${group}`;
  return knockout(positions, {
    id: (round, game) => `${base}-R${round}J${game}`,
    stage: (round, game, roundsLeft, games) => {
      if (roundsLeft === 0) return "Final do grupo";
      if (roundsLeft === 1) return `Meia-final do grupo${games > 1 ? ` ${game}` : ""}`;
      return `Ronda ${round} - Jogo ${game}`;
    },
  });
}

/**
 * Fase final a partir dos vencedores dos grupos, pela ordem dos grupos: A contra B,
 * C contra D, ... Se o número de grupos não for potência de 2, os últimos passam
 * uma ronda sem jogar. Com meias-finais, junta o jogo do 3.º/4.º lugar.
 */
export function generateFinals(modality: string, groups: string[]): Match[] {
  if (groups.length < 2) return [];
  const size = nextPowerOfTwo(groups.length);
  const winners: (Slot | null)[] = groups.map((g) => `WIN_GROUP:${modality}:${g}`);
  // Isenções no fim, sem pôr dois lugares vazios frente a frente.
  const positions: (Slot | null)[] = [];
  const byes = size - groups.length;
  let w = 0;
  for (let pair = 0; pair < size / 2; pair++) {
    const pairsLeft = size / 2 - pair;
    if (pairsLeft <= byes) positions.push(winners[w++], null);
    else positions.push(winners[w++], winners[w++]);
  }

  return finalsKnockout(modality, positions);
}

/**
 * Fase final sem grupos: eliminatória direta entre as equipas, por ordem de cabeça de
 * série (como nos grupos, as primeiras ficam isentas da 1.ª ronda se for preciso).
 * Mesmos nomes e ids que a fase final a partir de grupos, com 3.º/4.º lugar.
 */
export function generateKnockout(modality: string, teams: string[]): Match[] {
  const names = teams.map((t) => t.trim()).filter(Boolean);
  if (names.length < 2) return [];
  const size = nextPowerOfTwo(names.length);
  return finalsKnockout(modality, seedOrder(size).map((seed) => names[seed - 1] ?? null));
}

/** Eliminatória com os nomes da fase final (Quartos, Meia-final, Final) e o jogo do 3.º/4.º lugar. */
function finalsKnockout(modality: string, positions: (Slot | null)[]): Match[] {
  const p = matchIdPrefix(modality);
  const names = ["FINAL", "MF", "QF", "OF"];
  const labels = ["Final", "Meia-final", "Quartos de final", "Oitavos de final"];
  const matches = knockout(positions, {
    id: (round, game, roundsLeft) =>
      roundsLeft === 0 ? `${p}-FINAL` : `${p}-${names[roundsLeft] ?? `R${round}J`}${game}`,
    stage: (round, game, roundsLeft) =>
      roundsLeft === 0 ? "Final" : `${labels[roundsLeft] ?? `Ronda ${round} - Jogo`} ${game}`,
  });

  // 3.º/4.º lugar entre os derrotados das meias, quando as duas existem.
  const final = matches[matches.length - 1];
  if (final && final.home.startsWith("WIN:") && final.away.startsWith("WIN:")) {
    matches.splice(matches.length - 1, 0, {
      id: `${p}-3LUG`,
      stage: "3.º/4.º lugar",
      home: `LOSS:${final.home.slice(4)}`,
      away: `LOSS:${final.away.slice(4)}`,
      homeScore: "",
      awayScore: "",
    });
  }
  return matches;
}
