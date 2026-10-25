import { describe, expect, it } from "vitest";
import {
  TO_BE_DECIDED,
  groupWinner,
  hasResult,
  loserOf,
  matchWinner,
  parseScore,
  resolveTournament,
  winnerOf,
  type Match,
  type TournamentState,
} from "./index";

function match(id: string, home: string, away: string, homeScore = "", awayScore = "", extra: Partial<Match> = {}): Match {
  return { id, stage: "", home, away, homeScore, awayScore, ...extra };
}

/** Formato do protótipo: grupo em eliminatória (J1, J2 → meias → final) e fase final com 4 grupos. */
function bracketTournament(groupMatches: Record<string, Match[]>, finals: Match[] = []): TournamentState {
  return {
    modalities: ["Voleibol"],
    groups: { Voleibol: Object.fromEntries(Object.entries(groupMatches).map(([k, matches]) => [k, { matches }])) },
    finals: { Voleibol: finals },
  };
}

function decidedGroup(g: string, winner: string): Match[] {
  return [match(`VB-${g}-F`, winner, `Outra ${g}`, "2", "0")];
}

describe("parseScore", () => {
  it("aceita inteiros e espaços", () => {
    expect(parseScore("21")).toBe(21);
    expect(parseScore(" 0 ")).toBe(0);
    expect(parseScore(3)).toBe(3);
  });

  it("devolve null para vazio ou texto inválido", () => {
    expect(parseScore("")).toBeNull();
    expect(parseScore(undefined)).toBeNull();
    expect(parseScore("21a")).toBeNull();
    expect(parseScore("-1")).toBeNull();
    expect(parseScore("2.5")).toBeNull();
  });
});

describe("winnerOf / loserOf", () => {
  it("decide pelo resultado", () => {
    const m = match("1", "Casa", "Fora", "21", "11");
    expect(winnerOf(m)).toBe("Casa");
    expect(loserOf(m)).toBe("Fora");
    expect(winnerOf(match("1", "Casa", "Fora", "14", "21"))).toBe("Fora");
  });

  it("compara números e não texto (9 < 10)", () => {
    expect(winnerOf(match("1", "Casa", "Fora", "9", "10"))).toBe("Fora");
  });

  it("jogo sem resultado não tem vencedor", () => {
    const m = match("1", "Casa", "Fora", "3", "");
    expect(hasResult(m)).toBe(false);
    expect(winnerOf(m)).toBeNull();
    expect(loserOf(m)).toBeNull();
  });

  it("empate usa tiebreakWinner", () => {
    const m = match("1", "Casa", "Fora", "1", "1", { tiebreakWinner: "Fora" });
    expect(winnerOf(m)).toBe("Fora");
    expect(loserOf(m)).toBe("Casa");
  });

  it("empate sem desempate, ou com desempate de outra equipa, fica por decidir", () => {
    expect(winnerOf(match("1", "Casa", "Fora", "1", "1"))).toBeNull();
    expect(winnerOf(match("1", "Casa", "Fora", "1", "1", { tiebreakWinner: "Intrusa" }))).toBeNull();
  });
});

describe("resolveTournament", () => {
  it("mantém nomes escritos à mão (formato em produção)", () => {
    const state = bracketTournament({
      A: [match("V-A-1", "24 - all cool", "9 - Reabilitação cancelada", "14", "21")],
    });
    expect(resolveTournament(state)).toEqual(state);
  });

  it("não altera o estado recebido", () => {
    const state = bracketTournament({ A: [match("J1", "X", "Y", "2", "1"), match("F", "WIN:J1", "Z")] });
    const copy = structuredClone(state);
    resolveTournament(state);
    expect(state).toEqual(copy);
  });

  it("resolve WIN: e LOSS: em cadeia dentro de um grupo", () => {
    const state = bracketTournament({
      A: [
        match("J1", "Ganza", "Fistoum", "21", "11"),
        match("J2", "Reabilitação", "Sede", "21", "11"),
        match("SF1", "all cool", "WIN:J1", "21", "13"),
        match("SF2", "Mamas", "WIN:J2", "17", "21"),
        match("F", "WIN:SF1", "WIN:SF2"),
        match("CONS", "LOSS:SF1", "LOSS:SF2"),
      ],
    });
    const [, , sf1, sf2, final, cons] = resolveTournament(state).groups.Voleibol.A.matches;
    expect(sf1.away).toBe("Ganza");
    expect(sf2.away).toBe("Reabilitação");
    expect([final.home, final.away]).toEqual(["all cool", "Reabilitação"]);
    expect([cons.home, cons.away]).toEqual(["Ganza", "Mamas"]);
  });

  it("não depende da ordem dos jogos na lista", () => {
    const state = bracketTournament({
      A: [match("F", "WIN:SF1", "Outra"), match("SF1", "WIN:J1", "Z", "3", "0"), match("J1", "X", "Y", "1", "0")],
    });
    expect(resolveTournament(state).groups.Voleibol.A.matches[0].home).toBe("X");
  });

  it("jogo anterior sem resultado fica 'Por definir'", () => {
    const state = bracketTournament({ A: [match("J1", "X", "Y"), match("F", "WIN:J1", "LOSS:J1")] });
    const final = resolveTournament(state).groups.Voleibol.A.matches[1];
    expect([final.home, final.away]).toEqual([TO_BE_DECIDED, TO_BE_DECIDED]);
  });

  it("um lado por decidir nunca é tratado como equipa, mesmo com resultado", () => {
    // J1 por jogar; SF1 tem resultado mas um dos lados ainda não se sabe.
    const state = bracketTournament({
      A: [match("J1", "X", "Y"), match("SF1", "WIN:J1", "Z", "0", "3"), match("F", "WIN:SF1", "LOSS:SF1")],
    });
    const final = resolveTournament(state).groups.Voleibol.A.matches[2];
    expect([final.home, final.away]).toEqual([TO_BE_DECIDED, TO_BE_DECIDED]);
  });

  it("id inexistente não rebenta e fica 'Por definir'", () => {
    const state = bracketTournament({ A: [match("F", "WIN:NAO-EXISTE", "Z")] });
    expect(resolveTournament(state).groups.Voleibol.A.matches[0].home).toBe(TO_BE_DECIDED);
  });

  it("referência circular não entra em ciclo infinito", () => {
    const state = bracketTournament({ A: [match("A1", "WIN:A2", "X", "1", "0"), match("A2", "WIN:A1", "Y", "1", "0")] });
    const [a1, a2] = resolveTournament(state).groups.Voleibol.A.matches;
    expect(a1.home).toBe(TO_BE_DECIDED);
    expect(a2.home).toBe(TO_BE_DECIDED);
  });

  it("ids com ':' funcionam em WIN:", () => {
    const state = bracketTournament({ A: [match("V:A:1", "X", "Y", "2", "0"), match("F", "WIN:V:A:1", "Z")] });
    expect(resolveTournament(state).groups.Voleibol.A.matches[1].home).toBe("X");
  });
});

describe("fase final", () => {
  const finals = [
    match("VB-MF1", "WIN_GROUP:Voleibol:A", "WIN_GROUP:Voleibol:B", "2", "1"),
    match("VB-MF2", "WIN_GROUP:Voleibol:C", "WIN_GROUP:Voleibol:D", "0", "2"),
    match("VB-3RD", "LOSS:VB-MF1", "LOSS:VB-MF2", "1", "1", { tiebreakWinner: "Equipa C" }),
    match("VB-FINAL", "WIN:VB-MF1", "WIN:VB-MF2", "2", "0"),
  ];

  it("vencedor do grupo é o vencedor do último jogo do grupo", () => {
    const state = bracketTournament({ A: [match("J1", "X", "Y", "1", "0"), match("FINAL-CAMPO", "WIN:J1", "Z", "0", "1")] });
    expect(groupWinner(state, "Voleibol", "A")).toBe("Z");
  });

  it("finalMatchId escolhe outro jogo como final do grupo", () => {
    const state = bracketTournament({ A: [match("F", "X", "Y", "1", "0"), match("AMIGAVEL", "Y", "Z", "1", "0")] });
    state.groups.Voleibol.A.finalMatchId = "F";
    expect(groupWinner(state, "Voleibol", "A")).toBe("X");
  });

  it("grupo sem final decidida ou inexistente devolve null", () => {
    const state = bracketTournament({ A: [match("F", "X", "Y")] });
    expect(groupWinner(state, "Voleibol", "A")).toBeNull();
    expect(groupWinner(state, "Voleibol", "Z")).toBeNull();
    expect(groupWinner(state, "Andebol", "A")).toBeNull();
  });

  it("meias-finais, 3.º/4.º lugar e final a partir dos vencedores dos grupos", () => {
    const state = bracketTournament(
      {
        A: decidedGroup("A", "Equipa A"),
        B: decidedGroup("B", "Equipa B"),
        C: decidedGroup("C", "Equipa C"),
        D: decidedGroup("D", "Equipa D"),
      },
      finals,
    );
    const [mf1, mf2, third, final] = resolveTournament(state).finals.Voleibol;
    expect([mf1.home, mf1.away]).toEqual(["Equipa A", "Equipa B"]);
    expect([mf2.home, mf2.away]).toEqual(["Equipa C", "Equipa D"]);
    expect([third.home, third.away]).toEqual(["Equipa B", "Equipa C"]);
    expect([final.home, final.away]).toEqual(["Equipa A", "Equipa D"]);
    expect(matchWinner(state, "VB-3RD")).toBe("Equipa C");
    expect(matchWinner(state, "VB-FINAL")).toBe("Equipa A");
  });

  it("grupo por decidir mostra 'Vencedor Grupo X' e bloqueia o resto do quadro", () => {
    const state = bracketTournament(
      { A: decidedGroup("A", "Equipa A"), B: [match("VB-B-F", "P", "Q")], C: decidedGroup("C", "Equipa C"), D: decidedGroup("D", "Equipa D") },
      finals,
    );
    const [mf1, , third, final] = resolveTournament(state).finals.Voleibol;
    expect(mf1.away).toBe("Vencedor Grupo B");
    expect(third.home).toBe(TO_BE_DECIDED);
    expect(final.home).toBe(TO_BE_DECIDED);
    expect(final.away).toBe("Equipa D");
    expect(matchWinner(state, "VB-MF1")).toBeNull();
  });

  it("modalidade sem grupos não rebenta", () => {
    const state: TournamentState = { modalities: ["Futebol"], groups: {}, finals: { Futebol: [match("F", "WIN_GROUP:Futebol:A", "X")] } };
    expect(resolveTournament(state).finals.Futebol[0].home).toBe("Vencedor Grupo A");
  });
});
