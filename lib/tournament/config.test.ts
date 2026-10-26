import { describe, expect, it } from "vitest";
import config from "../../tournament.config.json";
import { tournamentSettings, type TournamentConfig } from "./index";

const base = { name: "Teste", edition: "'27", title: "Teste 2027" };

describe("tournament.config.json", () => {
  it("tem os campos de que a app precisa", () => {
    const typed: TournamentConfig = config;
    expect(typed.platformName.trim()).not.toBe("");
    expect(typed.id.trim()).not.toBe("");
    expect(typed.modalities.length).toBeGreaterThan(0);
    expect(typed.groups.length).toBeGreaterThan(0);
    expect(new Set(typed.groups).size).toBe(typed.groups.length);
    expect(typed.groups).not.toContain("Finais");
  });
});

describe("tournamentSettings", () => {
  it("usa os textos da base de dados e completa com a configuração", () => {
    const state = { settings: { name: "Taça AAUM", title: " " } };
    expect(tournamentSettings(state, base)).toEqual({ name: "Taça AAUM", edition: "'27", title: "Teste 2027" });
  });

  it("sem textos na base de dados usa a configuração; edição vazia apaga a edição", () => {
    expect(tournamentSettings(null, base)).toEqual({ name: "Teste", edition: "'27", title: "Teste 2027" });
    expect(tournamentSettings({ settings: { edition: "" } }, base).edition).toBe("");
  });
});
