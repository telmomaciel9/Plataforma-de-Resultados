import { describe, expect, it } from "vitest";
import {
  buildBracket,
  generateFinals,
  generateGroupMatches,
  matchIdPrefix,
  matchWinner,
  resolveTournament,
  seedOrder,
  simulate,
  type BracketNode,
  type TournamentState,
} from "./index";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `Equipa ${i + 1}`);
const shape = (node: BracketNode | null): string =>
  !node ? "" : node.children.length ? `${node.match.id}(${node.children.map(shape).join(",")})` : node.match.id;

describe("matchIdPrefix / seedOrder", () => {
  it("ids sem acentos nem espaços, diferentes para modalidades parecidas", () => {
    expect(matchIdPrefix("Ténis de mesa")).toBe("TENIS-DE-MESA");
    expect(matchIdPrefix("Futebol")).not.toBe(matchIdPrefix("Futsal"));
  });

  it("ordem clássica das cabeças de série", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });
});

describe("generateGroupMatches", () => {
  it("6 equipas dá o formato de 2026: 2 jogos na 1.ª ronda, as cabeças de série 1 e 2 entram nas meias", () => {
    const matches = generateGroupMatches("Voleibol", "A", ["all cool", "Mamas", "Ganza", "Reabilitação", "Sede", "Fistoum"]);
    expect(matches.map((m) => [m.id, m.stage, m.home, m.away])).toEqual([
      ["VOLEIBOL-A-R1J1", "Ronda 1 - Jogo 1", "Reabilitação", "Sede"],
      ["VOLEIBOL-A-R1J2", "Ronda 1 - Jogo 2", "Ganza", "Fistoum"],
      ["VOLEIBOL-A-R2J1", "Meia-final do grupo 1", "all cool", "WIN:VOLEIBOL-A-R1J1"],
      ["VOLEIBOL-A-R2J2", "Meia-final do grupo 2", "Mamas", "WIN:VOLEIBOL-A-R1J2"],
      ["VOLEIBOL-A-R3J1", "Final do grupo", "WIN:VOLEIBOL-A-R2J1", "WIN:VOLEIBOL-A-R2J2"],
    ]);
    expect(matches.every((m) => m.homeScore === "" && m.awayScore === "")).toBe(true);
  });

  it.each([2, 3, 4, 5, 7, 8, 9, 16])("%i equipas: n-1 jogos, todos com ids diferentes, todas as equipas jogam", (n) => {
    const matches = generateGroupMatches("Futebol", "B", teams(n));
    expect(matches).toHaveLength(n - 1);
    expect(new Set(matches.map((m) => m.id)).size).toBe(n - 1);
    const named = new Set(matches.flatMap((m) => [m.home, m.away]).filter((s) => !s.startsWith("WIN:")));
    expect(named).toEqual(new Set(teams(n)));
    expect(matches[matches.length - 1].stage).toBe("Final do grupo");
  });

  it("2 equipas: só a final do grupo", () => {
    expect(generateGroupMatches("Futebol", "A", ["X", "Y"]).map((m) => [m.stage, m.home, m.away])).toEqual([
      ["Final do grupo", "X", "Y"],
    ]);
  });

  it("menos de 2 equipas, ou nomes vazios, não gera jogos", () => {
    expect(generateGroupMatches("Futebol", "A", ["Sozinha"])).toEqual([]);
    expect(generateGroupMatches("Futebol", "A", ["  ", "X"])).toEqual([]);
  });
});

describe("generateFinals", () => {
  it("4 grupos: meias A-B e C-D, 3.º/4.º lugar e final", () => {
    expect(generateFinals("Voleibol", ["A", "B", "C", "D"]).map((m) => [m.id, m.stage, m.home, m.away])).toEqual([
      ["VOLEIBOL-MF1", "Meia-final 1", "WIN_GROUP:Voleibol:A", "WIN_GROUP:Voleibol:B"],
      ["VOLEIBOL-MF2", "Meia-final 2", "WIN_GROUP:Voleibol:C", "WIN_GROUP:Voleibol:D"],
      ["VOLEIBOL-3LUG", "3.º/4.º lugar", "LOSS:VOLEIBOL-MF1", "LOSS:VOLEIBOL-MF2"],
      ["VOLEIBOL-FINAL", "Final", "WIN:VOLEIBOL-MF1", "WIN:VOLEIBOL-MF2"],
    ]);
  });

  it("2 grupos: só a final", () => {
    expect(generateFinals("Futebol", ["A", "B"]).map((m) => m.id)).toEqual(["FUTEBOL-FINAL"]);
  });

  it("8 grupos: quartos, meias, 3.º lugar e final", () => {
    const ids = generateFinals("Futebol", ["A", "B", "C", "D", "E", "F", "G", "H"]).map((m) => m.id);
    expect(ids).toEqual([
      "FUTEBOL-QF1", "FUTEBOL-QF2", "FUTEBOL-QF3", "FUTEBOL-QF4",
      "FUTEBOL-MF1", "FUTEBOL-MF2", "FUTEBOL-3LUG", "FUTEBOL-FINAL",
    ]);
  });

  it("3 grupos: o C vai direto à final, sem jogo de 3.º lugar", () => {
    expect(generateFinals("Futebol", ["A", "B", "C"]).map((m) => [m.id, m.home, m.away])).toEqual([
      ["FUTEBOL-MF1", "WIN_GROUP:Futebol:A", "WIN_GROUP:Futebol:B"],
      ["FUTEBOL-FINAL", "WIN:FUTEBOL-MF1", "WIN_GROUP:Futebol:C"],
    ]);
  });

  it("1 grupo: sem fase final", () => {
    expect(generateFinals("Futebol", ["A"])).toEqual([]);
  });
});

describe("torneio gerado de ponta a ponta", () => {
  function generated(): TournamentState {
    const groups = ["A", "B", "C", "D"];
    return {
      modalities: ["Voleibol"],
      groups: { Voleibol: Object.fromEntries(groups.map((g) => [g, { matches: generateGroupMatches("Voleibol", g, teams(6).map((t) => `${g}${t}`)) }])) },
      finals: { Voleibol: generateFinals("Voleibol", groups) },
    };
  }

  it("o quadro de cada grupo é a árvore esperada", () => {
    expect(shape(buildBracket(generated(), "Voleibol", "A").root)).toBe(
      "VOLEIBOL-A-R3J1(VOLEIBOL-A-R2J1(VOLEIBOL-A-R1J1),VOLEIBOL-A-R2J2(VOLEIBOL-A-R1J2))",
    );
  });

  it("simulando sempre a equipa da casa, o campeão sai da cabeça de série 1 do Grupo A", () => {
    const state = generated();
    const all = [...Object.values(state.groups.Voleibol).flatMap((g) => g.matches), ...state.finals.Voleibol];
    const picks = Object.fromEntries(all.map((m) => [m.id, "home" as const]));
    const { state: sim } = simulate(state, picks);
    expect(matchWinner(sim, "VOLEIBOL-FINAL")).toBe("AEquipa 1");
    const third = resolveTournament(sim).finals.Voleibol.find((m) => m.id === "VOLEIBOL-3LUG")!;
    expect([third.home, third.away]).toEqual(["BEquipa 1", "DEquipa 1"]);
  });
});
