import { describe, expect, it } from "vitest";
import config from "../../tournament.config.json";
import {
  applyEdits,
  emptyTournament,
  finalsTemplate,
  resolveTournament,
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

describe("finalsTemplate", () => {
  it("4 grupos: meias, 3.º/4.º lugar e final", () => {
    const finals = finalsTemplate("Voleibol", ["A", "B", "C", "D"]);
    expect(finals.map((m) => [m.id, m.home, m.away])).toEqual([
      ["VOL-MF1", "WIN_GROUP:Voleibol:A", "WIN_GROUP:Voleibol:B"],
      ["VOL-MF2", "WIN_GROUP:Voleibol:C", "WIN_GROUP:Voleibol:D"],
      ["VOL-3LUG", "LOSS:VOL-MF1", "LOSS:VOL-MF2"],
      ["VOL-FINAL", "WIN:VOL-MF1", "WIN:VOL-MF2"],
    ]);
  });

  it("2 grupos: só a final; 1 ou 3 grupos: nada gerado", () => {
    expect(finalsTemplate("Futebol", ["A", "B"]).map((m) => m.id)).toEqual(["FUT-FINAL"]);
    expect(finalsTemplate("Futebol", ["A"])).toEqual([]);
    expect(finalsTemplate("Futebol", ["A", "B", "C"])).toEqual([]);
  });

  it("ids sem acentos nem espaços", () => {
    expect(finalsTemplate("Ténis de mesa", ["A", "B"])[0].id).toBe("TEN-FINAL");
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
