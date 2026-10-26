import { describe, expect, it } from "vitest";
import {
  FINALS,
  addEdit,
  allTeams,
  applyEdits,
  buildBracket,
  generateKnockout,
  isKnockoutOnly,
  matchWinner,
  modalityTeams,
  newCompetition,
  simulate,
  slotOptions,
  swapTeams,
  teamMatches,
  validateNewCompetition,
  type BracketNode,
  type Edit,
  type TournamentState,
} from "./index";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `Equipa ${i + 1}`);
const shape = (node: BracketNode | null): string =>
  !node ? "" : node.children.length ? `${node.match.id}(${node.children.map(shape).join(",")})` : node.match.id;

describe("generateKnockout (só fase final)", () => {
  it("8 equipas: quartos, meias, 3.º/4.º lugar e final, com as cabeças de série separadas", () => {
    const matches = generateKnockout("Futsal", teams(8));
    expect(matches.map((m) => [m.id, m.stage])).toEqual([
      ["FUTSAL-QF1", "Quartos de final 1"],
      ["FUTSAL-QF2", "Quartos de final 2"],
      ["FUTSAL-QF3", "Quartos de final 3"],
      ["FUTSAL-QF4", "Quartos de final 4"],
      ["FUTSAL-MF1", "Meia-final 1"],
      ["FUTSAL-MF2", "Meia-final 2"],
      ["FUTSAL-3LUG", "3.º/4.º lugar"],
      ["FUTSAL-FINAL", "Final"],
    ]);
    expect([matches[0].home, matches[0].away]).toEqual(["Equipa 1", "Equipa 8"]);
  });

  it("6 equipas: as cabeças de série 1 e 2 entram diretamente nas meias", () => {
    const matches = generateKnockout("Futsal", teams(6));
    const mf = matches.filter((m) => m.stage.startsWith("Meia-final"));
    expect(mf.map((m) => m.home)).toEqual(["Equipa 1", "Equipa 2"]);
    expect(matches).toHaveLength(6); // 5 jogos de eliminação + 3.º/4.º lugar
  });

  it("2 equipas: só a final; 3 equipas: meia e final, sem 3.º lugar", () => {
    expect(generateKnockout("Futsal", ["A", "B"]).map((m) => m.stage)).toEqual(["Final"]);
    expect(generateKnockout("Futsal", ["A", "B", "C"]).map((m) => m.stage)).toEqual(["Meia-final 1", "Final"]);
    expect(generateKnockout("Futsal", ["Sozinha"])).toEqual([]);
  });
});

describe("competição só com fase final", () => {
  const created = () => newCompetition({ name: "Taça", edition: "'27", modalities: ["Futsal"], format: "knockout", groupCount: 0 }).state;

  it("é criada sem grupos, com a lista de equipas da fase final vazia", () => {
    const state = created();
    expect(state.groups.Futsal).toEqual({});
    expect(state.finals.Futsal).toEqual([]);
    expect(state.finalsTeams).toEqual({ Futsal: [] });
    expect(isKnockoutOnly(state, "Futsal")).toBe(true);
    expect(validateNewCompetition({ name: "Taça", edition: "", modalities: ["Futsal"], format: "knockout", groupCount: 0 })).toEqual([]);
  });

  function withBracket(): TournamentState {
    const edits: Edit[] = [
      { type: "finalsTeams", modality: "Futsal", from: [], to: teams(4) },
      { type: "replaceMatches", modality: "Futsal", group: FINALS, from: [], matches: generateKnockout("Futsal", teams(4)) },
    ];
    return applyEdits(created(), edits.reduce(addEdit, [] as Edit[])).state;
  }

  it("equipas e quadro gerado: árvore, equipas, páginas de equipa e opções do admin", () => {
    const state = withBracket();
    expect(shape(buildBracket(state, "Futsal", FINALS).root)).toBe("FUTSAL-FINAL(FUTSAL-MF1,FUTSAL-MF2)");
    expect(allTeams(state).map((t) => t.name)).toEqual(teams(4));
    expect(modalityTeams(state, "Futsal")).toEqual(teams(4));
    expect(teamMatches(state, "Equipa 1").map((m) => m.match.id)).toEqual(["FUTSAL-MF1"]);
    expect(slotOptions(state, "Futsal", "FUTSAL-FINAL").filter((o) => o.kind === "team").map((o) => o.value)).toEqual(teams(4));
  });

  it("simulada até ao fim dá o campeão", () => {
    const state = withBracket();
    const picks = Object.fromEntries(state.finals.Futsal.map((m) => [m.id, "home" as const]));
    expect(matchWinner(simulate(state, picks).state, "FUTSAL-FINAL")).toBe("Equipa 1");
  });

  it("mudar o nome e trocar equipas também atualizam a lista da fase final", () => {
    let state = applyEdits(withBracket(), [{ type: "renameTeam", modality: "Futsal", from: "Equipa 1", to: "Campeões" }]).state;
    expect(state.finalsTeams!.Futsal[0]).toBe("Campeões");
    expect(state.finals.Futsal[0].home).toBe("Campeões");

    const swap = swapTeams(state, "Futsal", "Campeões", "Equipa 2");
    state = applyEdits(state, swap.edits.reduce(addEdit, [] as Edit[])).state;
    expect(state.finalsTeams!.Futsal.slice(0, 2)).toEqual(["Equipa 2", "Campeões"]);
    expect(state.finals.Futsal[0].home).toBe("Equipa 2");
  });

  it("finalsTeams junta-se no rascunho e avisa se outro admin mudou a lista", () => {
    let edits = addEdit([], { type: "finalsTeams", modality: "Futsal", from: [], to: ["A"] });
    edits = addEdit(edits, { type: "finalsTeams", modality: "Futsal", from: ["A"], to: ["A", "B"] });
    expect(edits).toEqual([{ type: "finalsTeams", modality: "Futsal", from: [], to: ["A", "B"] }]);
    const other = { ...created(), finalsTeams: { Futsal: ["X"] } };
    expect(applyEdits(other, edits).conflicts[0]).toMatchObject({ reason: "changed", current: "X" });
  });

  it("remover a modalidade remove também as equipas da fase final", () => {
    const state = applyEdits(created(), [{ type: "removeModality", modality: "Futsal" }]).state;
    expect(state.finalsTeams).toEqual({});
  });
});
