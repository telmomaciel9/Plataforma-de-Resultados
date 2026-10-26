import { describe, expect, it } from "vitest";
import { FINALS, buildBracket, simulate, type BracketNode, type Match, type TournamentState } from "./index";

function match(id: string, home: string, away: string, homeScore = "", awayScore = "", extra: Partial<Match> = {}): Match {
  return { id, stage: id, home, away, homeScore, awayScore, ...extra };
}

/** Árvore em texto: "F(SF1(J1),SF2(J2,J3))". */
function shape(node: BracketNode | null): string {
  if (!node) return "";
  return node.children.length ? `${node.match.id}(${node.children.map(shape).join(",")})` : node.match.id;
}

/** Voleibol grupo B e fase final como em 2026: nomes escritos à mão, sem referências. */
function real2026(): TournamentState {
  return {
    modalities: ["Voleibol"],
    groups: {
      Voleibol: {
        A: { matches: [match("A-F", "9 - Reabilitação", "24 - all cool", "21", "14")] },
        B: {
          matches: [
            match("J1", "1 - Atirei", "10 - João", "21", "8"),
            match("J2", "15 - Trupe", "16 - Boyca", "19", "21"),
            match("J3", "17 - SOS", "18 - Aboubacrew", "10", "21"),
            match("SF1", "14 - Havaianas", "1 - Atirei", "18", "21"),
            match("SF2", "16 - Boyca", "18 - Aboubacrew", "21", "13"),
            match("F", "1 - Atirei", "16 - Boyca", "21", "11"),
          ],
        },
        C: { matches: [match("C-F", "20 - Niguiris", "X", "2", "0")] },
        D: { matches: [match("D-F", "2 - DeGatas", "Y", "2", "0")] },
      },
    },
    finals: {
      Voleibol: [
        match("MF1", "9 - Reabilitação", "1 - Atirei", "6", "25"),
        match("MF2", "20 - Niguiris", "2 - DeGatas", "25", "17"),
        match("3LUG", "9 - Reabilitação", "2 - DeGatas", "25", "19"),
        match("FINAL", "1 - Atirei", "20 - Niguiris", "25", "23"),
      ],
    },
  };
}

describe("buildBracket com nomes escritos à mão", () => {
  it("deduz a árvore do grupo a partir de quem ganhou cada jogo", () => {
    const bracket = buildBracket(real2026(), "Voleibol", "B");
    expect(shape(bracket.root)).toBe("F(SF1(J1),SF2(J2,J3))");
    expect(bracket.others).toEqual([]);
  });

  it("fase final: final com as meias; 3.º/4.º lugar fora da árvore", () => {
    const bracket = buildBracket(real2026(), "Voleibol", FINALS);
    expect(shape(bracket.root)).toBe("FINAL(MF1,MF2)");
    expect(bracket.others.map((n) => n.match.id)).toEqual(["3LUG"]);
    expect(bracket.others[0].origins).toEqual({ home: "Derrotado: MF1", away: "Derrotado: MF2" });
  });

  it("indica de que grupo vem cada equipa das meias", () => {
    const [mf1, mf2] = buildBracket(real2026(), "Voleibol", FINALS).root!.children;
    expect(mf1.origins).toEqual({ home: "1.º Grupo A", away: "1.º Grupo B" });
    expect(mf2.origins).toEqual({ home: "1.º Grupo C", away: "1.º Grupo D" });
  });

  it("um jogo que ainda não terminou não liga a árvore", () => {
    const state = real2026();
    state.groups.Voleibol.B.matches[0].status = "live";
    expect(shape(buildBracket(state, "Voleibol", "B").root)).toBe("F(SF1,SF2(J2,J3))");
  });
});

describe("buildBracket com referências", () => {
  const withRefs = (): TournamentState => ({
    modalities: ["Futebol"],
    groups: {
      Futebol: {
        A: { matches: [match("A1", "P", "Q", "1", "0"), match("A2", "R", "S"), match("AF", "WIN:A1", "WIN:A2")] },
        B: { matches: [match("BF", "T", "U", "2", "1")] },
      },
    },
    finals: {
      Futebol: [
        match("FINAL", "WIN:MF1", "WIN:MF2"),
        match("MF1", "WIN_GROUP:Futebol:A", "WIN_GROUP:Futebol:B"),
        match("MF2", "V", "W"),
        match("3LUG", "LOSS:MF1", "LOSS:MF2"),
      ],
    },
  });

  it("segue WIN: mesmo fora de ordem e mostra a origem das referências", () => {
    const bracket = buildBracket(withRefs(), "Futebol", FINALS);
    expect(shape(bracket.root)).toBe("FINAL(MF1,MF2)");
    expect(bracket.root!.children[0].origins).toEqual({ home: "1.º Grupo A", away: "1.º Grupo B" });
    expect(bracket.others[0].match.id).toBe("3LUG");
  });

  it("o 3.º lugar por decidir mostra de onde vem cada equipa", () => {
    const [third] = buildBracket(withRefs(), "Futebol", FINALS).others;
    expect(third.match.home).toBe("Por definir");
    expect(third.origins).toEqual({ home: "Derrotado: MF1", away: "Derrotado: MF2" });
  });

  it("grupo com referências: árvore e nomes resolvidos", () => {
    const bracket = buildBracket(withRefs(), "Futebol", "A");
    expect(shape(bracket.root)).toBe("AF(A1,A2)");
    expect(bracket.root!.match.home).toBe("P");
    expect(bracket.root!.match.away).toBe("Por definir");
  });

  it("lista vazia não tem quadro", () => {
    expect(buildBracket(withRefs(), "Futebol", "Z")).toEqual({ root: null, others: [] });
  });
});

describe("simulate", () => {
  const state = (): TournamentState => ({
    modalities: ["Futebol"],
    groups: { Futebol: { A: { matches: [match("A1", "P", "Q", "1", "0"), match("A2", "R", "S"), match("AF", "WIN:A1", "WIN:A2")] } } },
    finals: { Futebol: [] },
  });

  it("faz avançar o lado escolhido e marca os jogos simulados", () => {
    const { state: sim, simulated } = simulate(state(), { A2: "away", AF: "home" });
    const tree = buildBracket(sim, "Futebol", "A").root!;
    expect([tree.match.home, tree.match.away]).toEqual(["P", "S"]);
    expect(tree.match.homeScore).toBe("1");
    expect([...simulated]).toEqual(["A2", "AF"]);
  });

  it("não mexe em jogos que já terminaram a sério nem no estado original", () => {
    const original = state();
    const { state: sim, simulated } = simulate(original, { A1: "away" });
    expect(sim.groups.Futebol.A.matches[0].homeScore).toBe("1");
    expect(simulated.size).toBe(0);
    expect(original.groups.Futebol.A.matches[1].status).toBeUndefined();
  });

  it("pode simular um jogo a decorrer", () => {
    const s = state();
    s.groups.Futebol.A.matches[1] = match("A2", "R", "S", "0", "2", { status: "live" });
    expect(simulate(s, { A2: "home" }).state.groups.Futebol.A.matches[1]).toMatchObject({ homeScore: "1", status: "finished" });
  });
});
