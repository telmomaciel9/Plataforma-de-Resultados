import { describe, expect, it } from "vitest";
import config from "../../tournament.config.json";
import {
  applyEdits,
  emptyTournament,
  resolveTournament,
  tournamentSettings,
  validateConfig,
  type TournamentConfig,
} from "./index";

const base: TournamentConfig = {
  id: "teste-2027",
  name: "Teste",
  edition: "'27",
  title: "Teste 2027",
  description: "",
  modalities: ["Voleibol", "Futebol"],
  groups: ["A", "B", "C", "D"],
};

describe("validateConfig", () => {
  it("aceita a configuração do repositório", () => {
    expect(validateConfig(config)).toEqual([]);
  });

  it("deteta campos em falta e valores repetidos ou inválidos", () => {
    const problems = validateConfig({ ...base, id: " ", modalities: ["Vólei", "Vólei"], groups: ["A", "Finais", "x:y"] });
    expect(problems).toEqual([
      "Falta o id do torneio.",
      "Modalidades repetidas: Vólei.",
      "Os grupos não podem ter ':' nem chamar-se 'Finais'.",
    ]);
  });
});

describe("tournamentSettings", () => {
  it("usa os textos da base de dados e completa com a configuração", () => {
    const state = { modalities: [], groups: {}, finals: {}, settings: { name: "Taça AAUM", title: " " } };
    expect(tournamentSettings(state, base)).toEqual({ name: "Taça AAUM", edition: "'27", title: "Teste 2027" });
  });

  it("sem textos na base de dados usa a configuração; edição vazia apaga a edição", () => {
    expect(tournamentSettings(null, base)).toEqual({ name: "Teste", edition: "'27", title: "Teste 2027" });
    const state = { modalities: [], groups: {}, finals: {}, settings: { edition: "" } };
    expect(tournamentSettings(state, base).edition).toBe("");
  });
});

describe("emptyTournament", () => {
  it("cria grupos vazios e o quadro final para cada modalidade", () => {
    const state = emptyTournament(base);
    expect(state.modalities).toEqual(["Voleibol", "Futebol"]);
    expect(Object.keys(state.groups.Futebol)).toEqual(["A", "B", "C", "D"]);
    expect(state.groups.Futebol.A.matches).toEqual([]);
    expect(state.finals.Voleibol).toHaveLength(4);
  });

  it("recusa uma configuração inválida", () => {
    expect(() => emptyTournament({ ...base, groups: [] })).toThrow("grupo");
  });

  it("o quadro gerado fica ligado aos jogos criados depois no admin", () => {
    const groupFinal = (g: string, winner: string) => ({
      type: "add" as const,
      modality: "Voleibol",
      group: g,
      match: { id: `V-${g}`, stage: "Final do grupo", home: winner, away: `Outra ${g}`, homeScore: "2", awayScore: "0" },
    });
    const { state } = applyEdits(emptyTournament(base), ["A", "B", "C", "D"].map((g) => groupFinal(g, `Equipa ${g}`)));
    const [mf1, mf2] = resolveTournament(state).finals.Voleibol;
    expect([mf1.home, mf1.away, mf2.home, mf2.away]).toEqual(["Equipa A", "Equipa B", "Equipa C", "Equipa D"]);
  });
});
