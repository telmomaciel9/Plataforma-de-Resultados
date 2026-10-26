import { describe, expect, it } from "vitest";
import {
  allTeams,
  findTeam,
  matchStatus,
  nextMatch,
  prospects,
  teamMatches,
  teamSlug,
  type Match,
  type TournamentState,
} from "./index";

function match(id: string, home: string, away: string, homeScore = "", awayScore = "", extra: Partial<Match> = {}): Match {
  return { id, stage: id, home, away, homeScore, awayScore, ...extra };
}

const GANZA = "5 - A Ganza está na Areia";

/** Voleibol: grupo A em eliminatória (J1 → F) e meia-final; Futebol: um jogo com hora. */
function tournament(): TournamentState {
  return {
    modalities: ["Voleibol", "Futebol"],
    groups: {
      Voleibol: {
        A: {
          matches: [
            match("J1", GANZA, "6 - Fistoum", "21", "11", { time: "10:00" }),
            match("J2", "9 - Reabilitação", "19 - Sede", "", "", { time: "10:30" }),
            match("F", "WIN:J1", "WIN:J2", "", "", { time: "11:30" }),
          ],
        },
        B: { matches: [match("B1", "1 - Alfa", "2 - Beta", "2", "1")] },
      },
      Futebol: { A: { matches: [match("FUT1", "7 - Gama", GANZA, "1", "1", { tiebreakWinner: GANZA, time: "09:00" })] } },
    },
    finals: {
      Voleibol: [
        match("MF1", "WIN_GROUP:Voleibol:A", "WIN_GROUP:Voleibol:B"),
        match("3LUG", "LOSS:MF1", "Outra"),
      ],
      Futebol: [],
    },
  };
}

describe("teamSlug", () => {
  it("tira acentos, espaços e símbolos", () => {
    expect(teamSlug(GANZA)).toBe("5-a-ganza-esta-na-areia");
    expect(teamSlug("13 - -1Guerreiro")).toBe("13-1guerreiro");
    expect(teamSlug("  Zé & Companhia!  ")).toBe("ze-companhia");
  });
});

describe("allTeams / findTeam", () => {
  it("junta as modalidades de cada equipa e ignora referências por decidir", () => {
    const teams = allTeams(tournament());
    expect(teams.map((t) => t.name)).toEqual([
      "1 - Alfa", "2 - Beta", GANZA, "6 - Fistoum", "7 - Gama", "9 - Reabilitação", "19 - Sede", "Outra",
    ]);
    expect(teams.find((t) => t.name === GANZA)?.modalities).toEqual(["Voleibol", "Futebol"]);
  });

  it("inclui as equipas da lista de um grupo, mesmo sem jogos", () => {
    const state = tournament();
    state.groups.Voleibol.B.teams = ["30 - Nova"];
    expect(findTeam(state, "30-nova")?.modalities).toEqual(["Voleibol"]);
  });

  it("encontra pelo endereço", () => {
    expect(findTeam(tournament(), "5-a-ganza-esta-na-areia")?.name).toBe(GANZA);
    expect(findTeam(tournament(), "nao-existe")).toBeUndefined();
  });
});

describe("matchStatus", () => {
  it("sem estado indicado: terminado se tiver resultado, senão por começar", () => {
    expect(matchStatus(match("x", "A", "B", "3", "1"))).toBe("played");
    expect(matchStatus(match("x", "A", "B", "3", ""))).toBe("upcoming");
  });

  it("o estado indicado pelo admin ganha ao resultado", () => {
    expect(matchStatus(match("x", "A", "B", "3", "1", { status: "live" }))).toBe("live");
    expect(matchStatus(match("x", "A", "B", "3", "1", { status: "upcoming" }))).toBe("upcoming");
    expect(matchStatus(match("x", "A", "B", "", "", { status: "finished" }))).toBe("played");
  });
});

describe("jogos a decorrer não fazem ninguém avançar", () => {
  it("o resultado parcial não conta até o jogo terminar", () => {
    const state = tournament();
    state.groups.Voleibol.A.matches[1] = match("J2", "9 - Reabilitação", "19 - Sede", "15", "10", { status: "live" });
    expect(teamMatches(state, "9 - Reabilitação").map((m) => m.match.id)).toEqual(["J2"]);
    state.groups.Voleibol.A.matches[1].status = "finished";
    expect(teamMatches(state, "9 - Reabilitação").map((m) => m.match.id)).toEqual(["J2", "F"]);
  });
});

describe("teamMatches", () => {
  it("lista os jogos da equipa em todas as modalidades, por hora", () => {
    const list = teamMatches(tournament(), GANZA);
    expect(list.map((m) => m.match.id)).toEqual(["FUT1", "J1", "F"]);
  });

  it("dá o adversário, o resultado do ponto de vista da equipa e o desfecho", () => {
    const [fut, j1, final] = teamMatches(tournament(), GANZA);
    expect(fut).toMatchObject({ opponent: "7 - Gama", teamScore: "1", opponentScore: "1", outcome: "win", wonOnTiebreak: true });
    expect(j1).toMatchObject({ opponent: "6 - Fistoum", teamScore: "21", opponentScore: "11", outcome: "win", wonOnTiebreak: false });
    expect(final).toMatchObject({ opponent: "Por definir", status: "upcoming", outcome: undefined });
  });

  it("derrota e empate sem desempate", () => {
    const state = tournament();
    state.groups.Voleibol.B.matches[0] = match("B1", "1 - Alfa", "2 - Beta", "1", "1");
    expect(teamMatches(state, "1 - Alfa")[0].outcome).toBe("draw");
    expect(teamMatches(tournament(), "2 - Beta")[0].outcome).toBe("loss");
  });

  it("aparece num jogo seguinte assim que a referência fica decidida", () => {
    const state = tournament();
    state.groups.Voleibol.A.matches[1] = match("J2", "9 - Reabilitação", "19 - Sede", "21", "15");
    state.groups.Voleibol.A.matches[2] = match("F", "WIN:J1", "WIN:J2", "21", "19");
    expect(teamMatches(state, GANZA).map((m) => m.match.id)).toContain("MF1");
    expect(teamMatches(state, GANZA).find((m) => m.match.id === "MF1")?.opponent).toBe("1 - Alfa");
  });

  it("equipa sem jogos devolve lista vazia", () => {
    expect(teamMatches(tournament(), "Ninguém")).toEqual([]);
  });
});

describe("nextMatch", () => {
  it("prefere o jogo a decorrer; senão o primeiro por jogar", () => {
    const state = tournament();
    expect(nextMatch(teamMatches(state, GANZA))?.match.id).toBe("F");
    state.groups.Futebol.A.matches[0] = match("FUT1", "7 - Gama", GANZA, "0", "0", { status: "live", time: "12:00" });
    expect(nextMatch(teamMatches(state, GANZA))?.match.id).toBe("FUT1");
  });

  it("undefined quando já jogou tudo", () => {
    expect(nextMatch(teamMatches(tournament(), "2 - Beta"))).toBeUndefined();
  });
});

describe("prospects", () => {
  it("se ganhar a final do grupo, joga a meia-final; se perder a meia, joga o 3.º lugar", () => {
    const state = tournament();
    state.groups.Voleibol.A.matches[1] = match("J2", "9 - Reabilitação", "19 - Sede", "21", "15");
    const list = prospects(state, GANZA);
    expect(list.map((p) => [p.from.match.id, p.condition, p.next.id, p.opponent])).toEqual([
      ["F", "win", "MF1", "1 - Alfa"],
    ]);

    // Ganhou a final do grupo: agora joga a meia, e se a perder vai ao 3.º lugar.
    state.groups.Voleibol.A.matches[2] = match("F", "WIN:J1", "WIN:J2", "21", "19");
    expect(prospects(state, GANZA).map((p) => [p.from.match.id, p.condition, p.next.id, p.opponent])).toEqual([
      ["MF1", "loss", "3LUG", "Outra"],
    ]);
  });

  it("nada quando a equipa não tem jogos por decidir", () => {
    expect(prospects(tournament(), "2 - Beta")).toEqual([]);
  });
});
