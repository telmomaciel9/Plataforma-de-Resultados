import { describe, expect, it } from "vitest";
import {
  FINALS,
  addEdit,
  applyEdits,
  conflictMessage,
  generateFinals,
  generateGroupMatches,
  publishEdits,
  type Edit,
  type Match,
  type Store,
  type TournamentState,
} from "./index";

function match(id: string, home: string, away: string, homeScore = "", awayScore = ""): Match {
  return { id, stage: id, home, away, homeScore, awayScore };
}

function tournament(): TournamentState {
  return {
    modalities: ["Voleibol", "Futebol"],
    groups: {
      Voleibol: {
        A: { teams: ["Alfa", "Beta"], matches: [match("V1", "Alfa", "Beta", "2", "1")] },
        B: { teams: ["Gama", "Delta", "Épsilon"], matches: [] },
      },
      Futebol: { A: { teams: ["Alfa"], matches: [match("F1", "Alfa", "Zeta")] } },
    },
    finals: { Voleibol: [match("VF", "Alfa", "Gama")], Futebol: [] },
  };
}

const groupB = (s: TournamentState) => s.groups.Voleibol.B;

describe("definições do torneio", () => {
  it("muda nome, edição e título; avisa se outro admin mudou o mesmo", () => {
    const { state } = applyEdits(tournament(), [{ type: "settings", field: "name", from: "", to: "Taça AAUM" }]);
    expect(state.settings).toEqual({ name: "Taça AAUM" });
    const other = { ...tournament(), settings: { name: "Outro nome" } };
    const { conflicts } = applyEdits(other, [{ type: "settings", field: "name", from: "", to: "Taça AAUM" }]);
    expect(conflicts[0]).toMatchObject({ reason: "changed", current: "Outro nome" });
  });

  it("addEdit junta e desfaz como nos jogos", () => {
    let edits = addEdit([], { type: "settings", field: "edition", from: "'26", to: "'2" });
    edits = addEdit(edits, { type: "settings", field: "edition", from: "'2", to: "'27" });
    expect(edits).toEqual([{ type: "settings", field: "edition", from: "'26", to: "'27" }]);
    expect(addEdit(edits, { type: "settings", field: "edition", from: "'27", to: "'26" })).toEqual([]);
  });
});

describe("equipas", () => {
  it("define a lista de equipas de um grupo", () => {
    const edit: Edit = { type: "teams", modality: "Voleibol", group: "B", from: ["Gama", "Delta", "Épsilon"], to: ["Delta", "Gama"] };
    expect(groupB(applyEdits(tournament(), [edit]).state).teams).toEqual(["Delta", "Gama"]);
  });

  it("várias edições à mesma lista ficam numa só; voltar ao original remove-a", () => {
    const from = ["Gama", "Delta", "Épsilon"];
    let edits = addEdit([], { type: "teams", modality: "Voleibol", group: "B", from, to: ["Gama"] });
    edits = addEdit(edits, { type: "teams", modality: "Voleibol", group: "B", from: ["Gama"], to: ["Gama", "Ómega"] });
    expect(edits).toEqual([{ type: "teams", modality: "Voleibol", group: "B", from, to: ["Gama", "Ómega"] }]);
    expect(addEdit(edits, { type: "teams", modality: "Voleibol", group: "B", from: ["Gama", "Ómega"], to: from })).toEqual([]);
  });

  it("mudar o nome de uma equipa muda-o nos grupos e em todos os jogos dessa modalidade, e só nela", () => {
    const { state } = applyEdits(tournament(), [{ type: "renameTeam", modality: "Voleibol", from: "Alfa", to: "Alfa FC" }]);
    expect(state.groups.Voleibol.A.teams).toEqual(["Alfa FC", "Beta"]);
    expect(state.groups.Voleibol.A.matches[0].home).toBe("Alfa FC");
    expect(state.finals.Voleibol[0].home).toBe("Alfa FC");
    expect(state.groups.Futebol.A.teams).toEqual(["Alfa"]);
    expect(state.groups.Futebol.A.matches[0].home).toBe("Alfa");
  });

  it("mudar o nome de uma equipa que não existe é um conflito", () => {
    const { conflicts } = applyEdits(tournament(), [{ type: "renameTeam", modality: "Voleibol", from: "Ninguém", to: "X" }]);
    expect(conflicts[0].reason).toBe("missing");
  });
});

describe("gerar quadro (replaceMatches)", () => {
  const generate = (state: TournamentState): Extract<Edit, { type: "replaceMatches" }> => ({
    type: "replaceMatches",
    modality: "Voleibol",
    group: "B",
    from: groupB(state).matches.map((m) => m.id),
    matches: generateGroupMatches("Voleibol", "B", groupB(state).teams!),
  });

  it("substitui os jogos do grupo pelo quadro gerado", () => {
    const { state, conflicts } = applyEdits(tournament(), [generate(tournament())]);
    expect(conflicts).toEqual([]);
    expect(groupB(state).matches.map((m) => m.stage)).toEqual(["Meia-final do grupo", "Final do grupo"]);
  });

  it("não se aplica se outro admin mudou os jogos do grupo entretanto", () => {
    const edit = generate(tournament());
    const published = applyEdits(tournament(), [{ type: "add", modality: "Voleibol", group: "B", match: match("NOVO", "X", "Y") }]).state;
    const { state, conflicts } = applyEdits(published, [edit]);
    expect(conflicts[0].reason).toBe("stale");
    expect(groupB(state).matches.map((m) => m.id)).toEqual(["NOVO"]);
  });

  it("não se aplica se um jogo do grupo já começou", () => {
    const state = tournament();
    groupB(state).matches = [match("B1", "Gama", "Delta")];
    const edit = generate(state);
    groupB(state).matches[0].status = "live";
    expect(applyEdits(state, [edit]).conflicts[0].reason).toBe("stale");
  });

  it("gerar de novo mantém o 'from' original e descarta edições aos jogos antigos e novos jogos à mão", () => {
    const state = tournament();
    groupB(state).matches = [match("B1", "Gama", "Delta")];
    let edits = addEdit([], { type: "update", matchId: "B1", field: "time", from: "", to: "10:00" });
    edits = addEdit(edits, { type: "add", modality: "Voleibol", group: "B", match: match("B2", "X", "Y") });
    edits = addEdit(edits, generate(state));
    edits = addEdit(edits, { ...generate(state), from: ["outra coisa"] });
    expect(edits).toHaveLength(1);
    expect(edits[0]).toMatchObject({ type: "replaceMatches", from: ["B1"] });
  });

  it("editar um jogo gerado e ainda não publicado altera o quadro gerado", () => {
    let edits = addEdit([], generate(tournament()));
    const id = (edits[0] as Extract<Edit, { type: "replaceMatches" }>).matches[0].id;
    edits = addEdit(edits, { type: "update", matchId: id, field: "time", from: "", to: "11:00" });
    expect(edits).toHaveLength(1);
    expect(groupB(applyEdits(tournament(), edits).state).matches[0].time).toBe("11:00");
  });

  it("gera a fase final na lista de Finais", () => {
    const edit: Edit = { type: "replaceMatches", modality: "Voleibol", group: FINALS, from: ["VF"], matches: generateFinals("Voleibol", ["A", "B"]) };
    expect(applyEdits(tournament(), [edit]).state.finals.Voleibol.map((m) => m.home)).toEqual(["WIN_GROUP:Voleibol:A"]);
  });
});

describe("grupos e modalidades", () => {
  it("acrescenta e remove grupos", () => {
    let { state } = applyEdits(tournament(), [{ type: "addGroup", modality: "Voleibol", group: "C" }]);
    expect(state.groups.Voleibol.C).toEqual({ teams: [], matches: [] });
    state = applyEdits(state, [{ type: "removeGroup", modality: "Voleibol", group: "B" }]).state;
    expect(Object.keys(state.groups.Voleibol)).toEqual(["A", "C"]);
  });

  it("não remove um grupo com jogos já jogados", () => {
    const { state, conflicts } = applyEdits(tournament(), [{ type: "removeGroup", modality: "Voleibol", group: "A" }]);
    expect(conflicts[0].reason).toBe("stale");
    expect(state.groups.Voleibol.A).toBeDefined();
  });

  it("acrescentar e remover no mesmo rascunho não deixa rasto, nem as edições pelo meio", () => {
    let edits = addEdit([], { type: "addGroup", modality: "Voleibol", group: "C" });
    edits = addEdit(edits, { type: "teams", modality: "Voleibol", group: "C", from: [], to: ["X", "Y"] });
    edits = addEdit(edits, { type: "removeGroup", modality: "Voleibol", group: "C" });
    expect(edits).toEqual([]);

    edits = addEdit([], { type: "addModality", modality: "Andebol", groups: ["A"] });
    edits = addEdit(edits, { type: "teams", modality: "Andebol", group: "A", from: [], to: ["X"] });
    edits = addEdit(edits, { type: "removeModality", modality: "Andebol" });
    expect(edits).toEqual([]);
  });

  it("acrescenta uma modalidade com grupos vazios e remove-a se nada começou", () => {
    let { state } = applyEdits(tournament(), [{ type: "addModality", modality: "Andebol", groups: ["A", "B"] }]);
    expect(state.modalities).toEqual(["Voleibol", "Futebol", "Andebol"]);
    expect(Object.keys(state.groups.Andebol)).toEqual(["A", "B"]);
    expect(state.finals.Andebol).toEqual([]);
    state = applyEdits(state, [{ type: "removeModality", modality: "Andebol" }]).state;
    expect(state.modalities).toEqual(["Voleibol", "Futebol"]);
    expect(applyEdits(state, [{ type: "removeModality", modality: "Voleibol" }]).conflicts[0].reason).toBe("stale");
  });
});

describe("conflictMessage", () => {
  it("explica cada tipo de conflito", () => {
    expect(conflictMessage({ edit: { type: "removeGroup", modality: "Voleibol", group: "A" }, reason: "stale" })).toContain("Grupo A (Voleibol)");
    expect(conflictMessage({ edit: { type: "update", matchId: "V1", field: "homeScore", from: "", to: "2" }, reason: "changed", current: "3" }))
      .toBe('o jogo V1: outro admin tinha posto "3"; ficou o teu valor.');
  });
});

describe("publicar um quadro gerado com outro admin a publicar ao mesmo tempo", () => {
  it("repete por cima dos dados novos; se o outro admin mexeu no mesmo grupo, não substitui", async () => {
    let row = { state: tournament(), version: 1 };
    let interfere: Edit[] | null = [{ type: "add", modality: "Voleibol", group: "B", match: match("NOVO", "X", "Y") }];
    const store: Store = {
      async load() { return { state: structuredClone(row.state), version: row.version }; },
      async save(state, expected) {
        if (interfere) { row = { state: applyEdits(row.state, interfere).state, version: row.version + 1 }; interfere = null; }
        if (expected !== row.version) return false;
        row = { state, version: row.version + 1 };
        return true;
      },
    };
    const edit: Edit = { type: "replaceMatches", modality: "Voleibol", group: "B", from: [], matches: generateGroupMatches("Voleibol", "B", ["Gama", "Delta"]) };
    const result = await publishEdits(store, [edit]);
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(result.ok && result.conflicts[0].reason).toBe("stale");
    expect(groupB(row.state).matches.map((m) => m.id)).toEqual(["NOVO"]);
  });
});
