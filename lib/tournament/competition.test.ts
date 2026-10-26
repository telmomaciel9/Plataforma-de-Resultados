import { describe, expect, it } from "vitest";
import {
  competitionId,
  competitionSummary,
  newCompetition,
  resolveTournament,
  tournamentSettings,
  validateNewCompetition,
} from "./index";

const input = { name: "Taça AAUM", edition: "'27", modalities: ["Futsal", "Basquetebol"], groupCount: 4 };

describe("competitionId", () => {
  it("endereço sem acentos, espaços nem aspas", () => {
    expect(competitionId("Gata na Praia", "'27")).toBe("gata-na-praia-27");
    expect(competitionId("Taça AAUM", "")).toBe("taca-aaum");
    expect(competitionId("  Liga  Inter-Cursos ", "2026/27")).toBe("liga-inter-cursos-2026-27");
  });
});

describe("validateNewCompetition", () => {
  it("aceita uma competição válida", () => {
    expect(validateNewCompetition(input)).toEqual([]);
  });

  it("explica o que falta ou está errado", () => {
    expect(validateNewCompetition({ name: " ", edition: "", modalities: [" "], groupCount: 0 })).toEqual([
      "Indica o nome da competição.",
      "Indica pelo menos uma modalidade.",
      "O número de grupos tem de ser entre 1 e 8.",
    ]);
    expect(validateNewCompetition({ ...input, name: "!!!", edition: "" })).toContain("O nome tem de ter letras ou números.");
    expect(validateNewCompetition({ ...input, modalities: ["Futsal", "Futsal", "a:b"] })).toEqual([
      "Há modalidades repetidas.",
      "As modalidades não podem ter ':'.",
    ]);
  });
});

describe("newCompetition", () => {
  it("cria o id, os textos, os grupos vazios e a fase final ligada aos grupos", () => {
    const { id, state } = newCompetition(input);
    expect(id).toBe("taca-aaum-27");
    expect(state.settings).toEqual({ name: "Taça AAUM", edition: "'27", title: "Taça AAUM '27" });
    expect(state.modalities).toEqual(["Futsal", "Basquetebol"]);
    expect(Object.keys(state.groups.Futsal)).toEqual(["A", "B", "C", "D"]);
    expect(state.groups.Basquetebol.D).toEqual({ teams: [], matches: [] });
    expect(state.finals.Futsal.map((m) => m.id)).toEqual(["FUTSAL-MF1", "FUTSAL-MF2", "FUTSAL-3LUG", "FUTSAL-FINAL"]);
    expect(resolveTournament(state).finals.Futsal[0].home).toBe("Vencedor Grupo A");
  });

  it("um grupo só: sem fase final", () => {
    expect(newCompetition({ ...input, groupCount: 1 }).state.finals.Futsal).toEqual([]);
  });

  it("os textos da competição nova ganham aos da configuração", () => {
    const { state } = newCompetition(input);
    expect(tournamentSettings(state, { name: "Gata na Praia", edition: "'26", title: "Gata na Praia 2026" })).toEqual(state.settings);
  });

  it("recusa dados inválidos", () => {
    expect(() => newCompetition({ ...input, modalities: [] })).toThrow("modalidade");
  });
});

describe("competitionSummary", () => {
  const defaults = { id: "gata-na-praia-2026-official", name: "Gata na Praia", edition: "'26" };

  it("usa o nome guardado na base de dados", () => {
    const summary = competitionSummary(
      { id: "taca-aaum-27", settings: { name: "Taça AAUM", edition: "'27" }, modalities: ["Futsal"], updated_at: "2026-10-26T10:00:00Z" },
      defaults,
    );
    expect(summary).toEqual({ id: "taca-aaum-27", name: "Taça AAUM", edition: "'27", modalities: ["Futsal"], updatedAt: new Date("2026-10-26T10:00:00Z") });
  });

  it("a competição de 2026, sem nome guardado, usa o da configuração; outras usam o id", () => {
    expect(competitionSummary({ id: defaults.id, settings: null, modalities: null }, defaults)).toMatchObject({
      name: "Gata na Praia", edition: "'26", modalities: [], updatedAt: null,
    });
    expect(competitionSummary({ id: "sem-nome", settings: null }, defaults)).toMatchObject({ name: "sem-nome", edition: "" });
  });
});
