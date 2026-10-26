// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { BracketView } from "./Bracket";

afterEach(cleanup);

function match(id, home, away, homeScore = "", awayScore = "", extra = {}) {
  return { id, stage: id, home, away, homeScore, awayScore, ...extra };
}

/** Fase final com as meias jogadas e a final por jogar, como o Futebol em 2026. */
const tournament = () => ({
  modalities: ["Futebol"],
  groups: { Futebol: {} },
  finals: {
    Futebol: [
      match("MF1", "Repetida", "Atirei", "2", "3"),
      match("MF2", "all cool", "Ganza", "3", "2"),
      match("3LUG", "Repetida", "Ganza", "2", "3"),
      match("FINAL", "WIN:MF1", "WIN:MF2"),
    ],
  },
});

const finalBox = () => screen.getByText("FINAL").closest("div.w-52");

describe("BracketView", () => {
  it("desenha a final com as equipas vindas das meias e o 3.º lugar à parte", () => {
    render(<BracketView state={tournament()} modality="Futebol" group="Finais" />);
    const box = within(finalBox());
    expect(box.getByText("Atirei")).toBeTruthy();
    expect(box.getByText("all cool")).toBeTruthy();
    expect(box.getByText("Por começar")).toBeTruthy();
    expect(screen.getByText("Outros jogos")).toBeTruthy();
    expect(screen.getAllByText("Derrotado: MF1").length).toBe(1);
  });

  it("sem simulação não há equipas clicáveis", () => {
    render(<BracketView state={tournament()} modality="Futebol" group="Finais" />);
    expect(within(finalBox()).queryAllByRole("button")).toHaveLength(0);
  });

  it("a simular: escolher o vencedor da final marca-o, sem tocar nos jogos terminados", () => {
    const state = tournament();
    render(<BracketView state={state} modality="Futebol" group="Finais" />);
    fireEvent.click(screen.getByRole("button", { name: /simular/i }));

    // Só a final (por jogar, com as duas equipas conhecidas) fica clicável.
    const buttons = within(finalBox()).getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(screen.getAllByRole("button").filter((b) => b.textContent.includes("Repetida"))).toHaveLength(0);

    fireEvent.click(buttons[1]); // all cool
    const box = within(finalBox());
    expect(box.getByText("Simulado")).toBeTruthy();
    expect(box.getByText("✓").closest("button").textContent).toContain("all cool");

    // Nada foi gravado no estado recebido.
    expect(state.finals.Futebol[3]).toMatchObject({ homeScore: "", awayScore: "" });

    // Tocar outra vez na mesma equipa desfaz a escolha; "Simular" desligado volta ao real.
    fireEvent.click(within(finalBox()).getAllByRole("button")[1]);
    expect(within(finalBox()).queryByText("Simulado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /a simular/i }));
    expect(within(finalBox()).getByText("Por começar")).toBeTruthy();
  });

  it("a simular uma meia por jogar faz a equipa escolhida aparecer na final", () => {
    const state = tournament();
    state.finals.Futebol[0] = match("MF1", "Repetida", "Atirei");
    render(<BracketView state={state} modality="Futebol" group="Finais" />);
    expect(within(finalBox()).getByText("Por definir")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /simular/i }));
    const repetida = screen.getAllByRole("button").find((b) => b.textContent.includes("Repetida"));
    fireEvent.click(repetida);
    expect(within(finalBox()).getByText("Repetida")).toBeTruthy();
  });
});
