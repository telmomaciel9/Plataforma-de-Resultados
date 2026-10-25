import { describe, expect, it } from "vitest";
import { FINALS, addEdit, applyEdits, publishEdits, type Edit, type Match, type Store, type TournamentState } from "./index";

function match(id: string, home = "Casa", away = "Fora", homeScore = "", awayScore = ""): Match {
  return { id, stage: "Ronda 1", home, away, homeScore, awayScore };
}

function tournament(): TournamentState {
  return {
    modalities: ["Voleibol", "Futebol"],
    groups: {
      Voleibol: { A: { matches: [match("V1"), match("V2")] }, B: { matches: [match("V3")] } },
      Futebol: { A: { matches: [match("F1")] } },
    },
    finals: { Voleibol: [match("VF")], Futebol: [] },
  };
}

const score = (matchId: string, to: string, from = "", field: "homeScore" | "awayScore" = "homeScore"): Edit =>
  ({ type: "update", matchId, field, from, to });

const groupA = (s: TournamentState) => s.groups.Voleibol.A.matches;

describe("addEdit", () => {
  it("junta edições do mesmo campo e mantém o valor original", () => {
    const edits = addEdit(addEdit([], score("V1", "1")), score("V1", "21", "1"));
    expect(edits).toEqual([score("V1", "21", "")]);
  });

  it("campos ou jogos diferentes ficam separados", () => {
    let edits = addEdit([], score("V1", "21"));
    edits = addEdit(edits, score("V1", "15", "", "awayScore"));
    edits = addEdit(edits, score("V2", "3"));
    expect(edits).toHaveLength(3);
  });

  it("voltar ao valor original remove a edição", () => {
    const edits = addEdit(addEdit([], score("V1", "21")), score("V1", "", "21"));
    expect(edits).toEqual([]);
  });

  it("editar um jogo criado neste rascunho altera a criação", () => {
    let edits = addEdit([], { type: "add", modality: "Voleibol", group: "A", match: match("NOVO") });
    edits = addEdit(edits, score("NOVO", "5"));
    expect(edits).toHaveLength(1);
    expect(edits[0].type === "add" && edits[0].match.homeScore).toBe("5");
  });

  it("apagar um jogo criado neste rascunho não deixa rasto", () => {
    let edits = addEdit([], { type: "add", modality: "Voleibol", group: "A", match: match("NOVO") });
    edits = addEdit(edits, score("NOVO", "5"));
    edits = addEdit(edits, { type: "delete", matchId: "NOVO" });
    expect(edits).toEqual([]);
  });

  it("apagar um jogo publicado descarta as edições pendentes desse jogo", () => {
    let edits = addEdit([], score("V1", "21"));
    edits = addEdit(edits, score("V2", "3"));
    edits = addEdit(edits, { type: "delete", matchId: "V1" });
    expect(edits).toEqual([score("V2", "3"), { type: "delete", matchId: "V1" }]);
  });
});

describe("applyEdits", () => {
  it("não altera o estado recebido", () => {
    const state = tournament();
    const copy = structuredClone(state);
    applyEdits(state, [score("V1", "21"), { type: "delete", matchId: "V2" }]);
    expect(state).toEqual(copy);
  });

  it("atualiza resultados em grupos e na fase final", () => {
    const { state, conflicts } = applyEdits(tournament(), [score("V3", "2"), score("VF", "3")]);
    expect(state.groups.Voleibol.B.matches[0].homeScore).toBe("2");
    expect(state.finals.Voleibol[0].homeScore).toBe("3");
    expect(conflicts).toEqual([]);
  });

  it("acrescenta jogos a grupos, à fase final e a grupos que ainda não existem", () => {
    const { state } = applyEdits(tournament(), [
      { type: "add", modality: "Voleibol", group: "A", match: match("N1") },
      { type: "add", modality: "Futebol", group: FINALS, match: match("N2") },
      { type: "add", modality: "Andebol", group: "C", match: match("N3") },
    ]);
    expect(groupA(state).map((m) => m.id)).toEqual(["V1", "V2", "N1"]);
    expect(state.finals.Futebol.map((m) => m.id)).toEqual(["N2"]);
    expect(state.groups.Andebol.C.matches.map((m) => m.id)).toEqual(["N3"]);
  });

  it("não duplica um jogo acrescentado duas vezes (publicação repetida)", () => {
    const add: Edit = { type: "add", modality: "Voleibol", group: "A", match: match("N1") };
    const once = applyEdits(tournament(), [add]).state;
    expect(groupA(applyEdits(once, [add]).state)).toHaveLength(3);
  });

  it("apaga jogos", () => {
    const { state } = applyEdits(tournament(), [{ type: "delete", matchId: "V1" }, { type: "delete", matchId: "VF" }]);
    expect(groupA(state).map((m) => m.id)).toEqual(["V2"]);
    expect(state.finals.Voleibol).toEqual([]);
  });

  it("mantém o que outro admin publicou noutros jogos", () => {
    const published = applyEdits(tournament(), [score("V2", "9")]).state; // outro admin
    const { state } = applyEdits(published, [score("V1", "21")]); // este admin
    expect(groupA(state)[0].homeScore).toBe("21");
    expect(groupA(state)[1].homeScore).toBe("9");
  });

  it("avisa quando outro admin mudou o mesmo campo, e fica o valor deste admin", () => {
    const published = applyEdits(tournament(), [score("V1", "18")]).state;
    const { state, conflicts } = applyEdits(published, [score("V1", "21")]);
    expect(groupA(state)[0].homeScore).toBe("21");
    expect(conflicts).toEqual([{ edit: score("V1", "21"), reason: "changed", current: "18" }]);
  });

  it("não é conflito se o outro admin pôs o mesmo valor", () => {
    const published = applyEdits(tournament(), [score("V1", "21")]).state;
    expect(applyEdits(published, [score("V1", "21")]).conflicts).toEqual([]);
  });

  it("avisa quando o jogo já foi apagado por outro admin", () => {
    const published = applyEdits(tournament(), [{ type: "delete", matchId: "V1" }]).state;
    const { state, conflicts } = applyEdits(published, [score("V1", "21"), { type: "delete", matchId: "V1" }]);
    expect(groupA(state).map((m) => m.id)).toEqual(["V2"]);
    expect(conflicts.map((c) => c.reason)).toEqual(["missing", "missing"]);
  });
});

/** Base de dados falsa com controlo de versão, como a tabela app_state. */
function fakeStore(initial: TournamentState, { versioned = true } = {}) {
  let row = { state: structuredClone(initial), version: versioned ? 1 : null as number | null };
  let beforeSave: (() => void) | null = null;
  const store: Store & { saves: number } = {
    saves: 0,
    async load() {
      return { state: structuredClone(row.state), version: row.version };
    },
    async save(state, expectedVersion) {
      beforeSave?.();
      if (row.version !== null && row.version !== expectedVersion) return false;
      store.saves++;
      row = { state: structuredClone(state), version: row.version === null ? null : row.version + 1 };
      return true;
    },
  };
  return {
    store,
    get row() { return row; },
    /** Simula outro admin a publicar entre a leitura e a gravação. */
    otherAdminPublishes(edits: Edit[], times = 1) {
      let left = times;
      beforeSave = () => {
        if (left-- <= 0) return;
        row = { state: applyEdits(row.state, edits).state, version: (row.version ?? 0) + 1 };
      };
    },
  };
}

describe("publishEdits", () => {
  it("publica à primeira quando ninguém mexeu", async () => {
    const db = fakeStore(tournament());
    const result = await publishEdits(db.store, [score("V1", "21")]);
    expect(result).toMatchObject({ ok: true, attempts: 1, conflicts: [] });
    expect(groupA(db.row.state)[0].homeScore).toBe("21");
    expect(db.row.version).toBe(2);
  });

  it("se outro admin publicou entretanto, repete e mantém as duas alterações", async () => {
    const db = fakeStore(tournament());
    db.otherAdminPublishes([score("V2", "9")]);
    const result = await publishEdits(db.store, [score("V1", "21")]);
    expect(result).toMatchObject({ ok: true, attempts: 2 });
    expect(groupA(db.row.state).map((m) => m.homeScore)).toEqual(["21", "9"]);
  });

  it("desiste ao fim de várias tentativas sem gravar nada", async () => {
    const db = fakeStore(tournament());
    db.otherAdminPublishes([score("V2", "9")], 10);
    const result = await publishEdits(db.store, [score("V1", "21")], 3);
    expect(result).toEqual({ ok: false, reason: "busy", attempts: 3 });
    expect(db.store.saves).toBe(0);
    expect(groupA(db.row.state)[0].homeScore).toBe("");
  });

  it("funciona sem coluna version (base de dados antes da migração)", async () => {
    const db = fakeStore(tournament(), { versioned: false });
    const result = await publishEdits(db.store, [score("V1", "21")]);
    expect(result).toMatchObject({ ok: true, attempts: 1 });
    expect(groupA(db.row.state)[0].homeScore).toBe("21");
  });

  it("erros de gravação chegam a quem chamou", async () => {
    const db = fakeStore(tournament());
    db.store.save = async () => { throw new Error("permission denied"); };
    await expect(publishEdits(db.store, [score("V1", "21")])).rejects.toThrow("permission denied");
  });
});
