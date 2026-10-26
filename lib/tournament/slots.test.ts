import { describe, expect, it } from "vitest";
import { createsCycle, matchTeams, needsTiebreak, slotOptions, type Match, type TournamentState } from "./index";

function match(id: string, home: string, away: string, homeScore = "", awayScore = "", stage = id): Match {
  return { id, stage, home, away, homeScore, awayScore };
}

/** Grupo em eliminatória: J1, J2 → F (final do grupo); fase final com uma meia. */
function tournament(): TournamentState {
  return {
    modalities: ["Voleibol", "Futebol"],
    groups: {
      Voleibol: {
        A: {
          teams: ["10 - Zeta"],
          matches: [
            match("J1", "2 - Beta", "1 - Alfa", "2", "1"),
            match("J2", "3 - Gama", "4 - Delta"),
            match("F", "WIN:J1", "WIN:J2", "", "", "Final do grupo"),
          ],
        },
        B: { matches: [match("B1", "5 - Épsilon", "6 - Zeta")] },
      },
      Futebol: { A: { matches: [match("FUT1", "Outra", "Equipa")] } },
    },
    finals: {
      Voleibol: [match("MF1", "WIN_GROUP:Voleibol:A", "WIN_GROUP:Voleibol:B"), match("AMIGAVEL", "1 - Alfa", "3 - Gama", "", "", "Jogo amigável")],
      Futebol: [],
    },
  };
}

const values = (state: TournamentState, matchId: string) => slotOptions(state, "Voleibol", matchId).map((o) => o.value);

describe("slotOptions", () => {
  it("lista as equipas da modalidade por ordem numérica, sem referências nem repetidos", () => {
    const teams = slotOptions(tournament(), "Voleibol", "J2").filter((o) => o.kind === "team").map((o) => o.value);
    expect(teams).toEqual(["1 - Alfa", "2 - Beta", "3 - Gama", "4 - Delta", "5 - Épsilon", "6 - Zeta", "10 - Zeta"]);
  });

  it("não mistura equipas de outras modalidades", () => {
    expect(values(tournament(), "J2")).not.toContain("Outra");
  });

  it("oferece vencedor e derrotado dos outros jogos e vencedor de cada grupo", () => {
    const options = values(tournament(), "MF1");
    expect(options).toEqual(expect.arrayContaining(["WIN:J1", "LOSS:J1", "WIN:F", "WIN:B1", "WIN_GROUP:Voleibol:A", "WIN_GROUP:Voleibol:B"]));
    expect(options).not.toContain("WIN:MF1");
  });

  it("descreve o jogo com o grupo, a fase e as equipas já resolvidas", () => {
    const label = slotOptions(tournament(), "Voleibol", "MF1").find((o) => o.value === "WIN:F")?.label;
    expect(label).toBe("Vencedor: Grupo A · Final do grupo (2 - Beta vs Por definir)");
    const finalLabel = slotOptions(tournament(), "Voleibol", "MF1").find((o) => o.value === "LOSS:AMIGAVEL")?.label;
    expect(finalLabel).toBe("Derrotado: Jogo amigável (1 - Alfa vs 3 - Gama)");
  });

  it("deixa de fora o que criaria uma referência circular", () => {
    // J1 alimenta F, que decide o Grupo A, que alimenta MF1: J1 não pode depender de nenhum deles.
    const options = values(tournament(), "J1");
    expect(options).not.toContain("WIN:F");
    expect(options).not.toContain("WIN_GROUP:Voleibol:A");
    expect(options).not.toContain("WIN:MF1");
    expect(options).toContain("WIN:B1");
    expect(options).toContain("WIN_GROUP:Voleibol:B");
  });
});

describe("createsCycle", () => {
  it("deteta ciclos diretos e indiretos", () => {
    const state = tournament();
    expect(createsCycle(state, "F", "WIN:F")).toBe(true);
    expect(createsCycle(state, "J2", "LOSS:F")).toBe(true);
    expect(createsCycle(state, "J2", "WIN:B1")).toBe(false);
    expect(createsCycle(state, "J2", "Equipa qualquer")).toBe(false);
    expect(createsCycle(state, "J2", "WIN:NAO-EXISTE")).toBe(false);
  });
});

describe("matchTeams / needsTiebreak", () => {
  it("devolve as equipas resolvidas, com null no lado por decidir", () => {
    expect(matchTeams(tournament(), "F")).toEqual({ home: "2 - Beta", away: null });
    expect(matchTeams(tournament(), "NAO-EXISTE")).toBeNull();
  });

  it("precisa de desempate só com empate e as duas equipas conhecidas", () => {
    const state = tournament();
    state.groups.Voleibol.A.matches[1] = match("J2", "3 - Gama", "4 - Delta", "1", "1");
    expect(needsTiebreak(state, state.groups.Voleibol.A.matches[1])).toBe(true);
    expect(needsTiebreak(state, match("J2", "3 - Gama", "4 - Delta", "2", "1"))).toBe(false);
    expect(needsTiebreak(state, match("J2", "3 - Gama", "4 - Delta", "", ""))).toBe(false);
    // F tem um lado por decidir enquanto J2 não tiver vencedor.
    state.groups.Voleibol.A.matches[2] = match("F", "WIN:J1", "WIN:J2", "0", "0");
    expect(needsTiebreak(state, state.groups.Voleibol.A.matches[2])).toBe(false);
  });
});
