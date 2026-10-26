import { describe, expect, it } from "vitest";
import { addEdit, applyEdits, generateGroupMatches, modalityTeams, swapTeams, type Match, type TournamentState } from "./index";

function match(id: string, home: string, away: string, homeScore = "", awayScore = ""): Match {
  return { id, stage: id, home, away, homeScore, awayScore };
}

/** Dois grupos gerados com 4 equipas cada, por começar; Futebol com a mesma equipa "Alfa". */
function tournament(): TournamentState {
  return {
    modalities: ["Voleibol", "Futebol"],
    groups: {
      Voleibol: {
        A: { teams: ["Alfa", "Beta", "Gama", "Delta"], matches: generateGroupMatches("Voleibol", "A", ["Alfa", "Beta", "Gama", "Delta"]) },
        B: { teams: ["Épsilon", "Zeta", "Eta", "Teta"], matches: generateGroupMatches("Voleibol", "B", ["Épsilon", "Zeta", "Eta", "Teta"]) },
      },
      Futebol: { A: { teams: ["Alfa", "Beta"], matches: [match("F1", "Alfa", "Beta")] } },
    },
    finals: { Voleibol: [], Futebol: [] },
  };
}

const apply = (state: TournamentState, edits: ReturnType<typeof swapTeams>["edits"]) =>
  applyEdits(state, edits.reduce(addEdit, [] as never[])).state;

describe("swapTeams", () => {
  it("troca duas equipas do mesmo grupo nos jogos e na lista", () => {
    const state = tournament();
    const result = swapTeams(state, "Voleibol", "Alfa", "Gama");
    const after = apply(state, result.edits);
    // Gerado com 4 equipas: Alfa-Delta e Beta-Gama na 1.ª ronda.
    expect(after.groups.Voleibol.A.matches.map((m) => [m.home, m.away]).slice(0, 2)).toEqual([["Gama", "Delta"], ["Beta", "Alfa"]]);
    expect(after.groups.Voleibol.A.teams).toEqual(["Gama", "Beta", "Alfa", "Delta"]);
    expect(result).toMatchObject({ changedMatches: 2, skippedMatches: 0 });
  });

  it("troca equipas entre grupos diferentes", () => {
    const state = tournament();
    const after = apply(state, swapTeams(state, "Voleibol", "Delta", "Épsilon").edits);
    expect(after.groups.Voleibol.A.teams).toContain("Épsilon");
    expect(after.groups.Voleibol.B.teams).toContain("Delta");
    expect(after.groups.Voleibol.A.matches[0]).toMatchObject({ home: "Alfa", away: "Épsilon" });
    expect(after.groups.Voleibol.B.matches[0]).toMatchObject({ home: "Delta", away: "Teta" });
  });

  it("não mexe noutras modalidades", () => {
    const state = tournament();
    const after = apply(state, swapTeams(state, "Voleibol", "Alfa", "Beta").edits);
    expect(after.groups.Futebol.A.matches[0]).toMatchObject({ home: "Alfa", away: "Beta" });
  });

  it("não mexe em jogos já começados ou terminados, e conta-os", () => {
    const state = tournament();
    state.groups.Voleibol.A.matches[0] = { ...state.groups.Voleibol.A.matches[0], homeScore: "21", awayScore: "10" };
    const result = swapTeams(state, "Voleibol", "Alfa", "Gama");
    const after = apply(state, result.edits);
    expect(after.groups.Voleibol.A.matches[0]).toMatchObject({ home: "Alfa", away: "Delta" });
    expect(after.groups.Voleibol.A.matches[1]).toMatchObject({ home: "Beta", away: "Alfa" });
    expect(result).toMatchObject({ changedMatches: 1, skippedMatches: 1 });
  });

  it("trocar uma equipa por ela própria, ou por nada, não faz nada", () => {
    expect(swapTeams(tournament(), "Voleibol", "Alfa", "Alfa").edits).toEqual([]);
    expect(swapTeams(tournament(), "Voleibol", "Alfa", "").edits).toEqual([]);
  });

  it("trocar de novo volta ao original e as edições anulam-se no rascunho", () => {
    const state = tournament();
    let edits = swapTeams(state, "Voleibol", "Alfa", "Gama").edits.reduce(addEdit, [] as never[]);
    const middle = applyEdits(state, edits).state;
    edits = swapTeams(middle, "Voleibol", "Alfa", "Gama").edits.reduce(addEdit, edits);
    expect(edits).toEqual([]);
  });
});

describe("modalityTeams", () => {
  it("junta as listas dos grupos e os nomes nos jogos, sem referências", () => {
    const state = tournament();
    state.finals.Voleibol = [match("VF", "WIN_GROUP:Voleibol:A", "Convidada")];
    expect(modalityTeams(state, "Voleibol")).toEqual(["Alfa", "Beta", "Convidada", "Delta", "Épsilon", "Eta", "Gama", "Teta", "Zeta"]);
  });
});
