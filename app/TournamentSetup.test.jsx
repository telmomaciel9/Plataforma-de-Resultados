// @vitest-environment jsdom
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { addEdit, applyEdits } from "@/lib/tournament";
import { TournamentSetup } from "./TournamentSetup";

let lastEdits = [];

/** Como a página: o rascunho é o publicado mais as alterações. */
function Harness({ published, modality = "Voleibol" }) {
  const [edits, setEdits] = useState([]);
  lastEdits = edits;
  const draft = applyEdits(published, edits).state;
  return <TournamentSetup draft={draft} published={published} modality={modality} onEdit={(e) => setEdits((l) => addEdit(l, e))} />;
}

function match(id, home, away, homeScore = "", awayScore = "") {
  return { id, stage: id, home, away, homeScore, awayScore };
}

/** Grupo A como em 2026 (jogos com nomes à mão, sem lista de equipas, já jogados); B vazio. */
const published = () => ({
  modalities: ["Voleibol"],
  groups: {
    Voleibol: {
      A: { matches: [match("J1", "Ganza", "Fistoum", "21", "11"), match("F", "all cool", "Ganza", "21", "13")] },
      B: { teams: [], matches: [] },
    },
  },
  finals: { Voleibol: [] },
});

const groupCard = (key) => screen.getByText(`Grupo ${key}`, { selector: "h3" }).closest("div.rounded-2xl");

beforeEach(() => {
  vi.spyOn(window, "confirm").mockReturnValue(true);
  vi.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("TournamentSetup", () => {
  it("acrescenta equipas, gera os jogos do grupo e mostra o quadro", () => {
    render(<Harness published={published()} />);
    const card = within(groupCard("B"));
    for (const name of ["Alfa", "Beta", "Gama"]) {
      fireEvent.change(card.getByPlaceholderText("Nova equipa"), { target: { value: name } });
      fireEvent.click(card.getByLabelText("Acrescentar equipa"));
    }
    expect(card.getByText("3 equipas → 2 jogos.")).toBeTruthy();

    fireEvent.click(card.getByRole("button", { name: /gerar jogos/i }));
    expect(card.getByText("Final do grupo")).toBeTruthy();
    expect(card.getByText("Meia-final do grupo")).toBeTruthy();
    expect(lastEdits.map((e) => e.type)).toEqual(["teams", "replaceMatches"]);
    expect(lastEdits[1].from).toEqual([]);
  });

  it("muda a ordem das equipas e remove uma", () => {
    const state = published();
    state.groups.Voleibol.B.teams = ["Alfa", "Beta", "Gama"];
    render(<Harness published={state} />);
    const card = within(groupCard("B"));
    fireEvent.click(card.getAllByLabelText("Descer")[0]);
    expect(card.getAllByRole("textbox").slice(0, 3).map((i) => i.value)).toEqual(["Beta", "Alfa", "Gama"]);
    fireEvent.click(card.getByLabelText("Remover Gama"));
    expect(lastEdits).toEqual([{ type: "teams", modality: "Voleibol", group: "B", from: ["Alfa", "Beta", "Gama"], to: ["Beta", "Alfa"] }]);
  });

  it("mudar o nome de uma equipa usa renameTeam (para atualizar também os jogos)", () => {
    const state = published();
    state.groups.Voleibol.B.teams = ["Alfa", "Beta"];
    render(<Harness published={state} />);
    const input = within(groupCard("B")).getByLabelText("Equipa 1");
    fireEvent.change(input, { target: { value: "Alfa FC" } });
    fireEvent.blur(input);
    expect(lastEdits).toEqual([{ type: "renameTeam", modality: "Voleibol", from: "Alfa", to: "Alfa FC" }]);
  });

  it("grupo de 2026: importa as equipas dos jogos, mas não deixa gerar porque já há jogos jogados", () => {
    render(<Harness published={published()} />);
    const card = within(groupCard("A"));
    fireEvent.click(card.getByText("Usar as 3 equipas dos jogos"));
    expect(card.getAllByRole("textbox").slice(0, 3).map((i) => i.value)).toEqual(["Ganza", "Fistoum", "all cool"]);
    expect(card.getByRole("button", { name: /gerar de novo/i }).disabled).toBe(true);
    expect(card.getByText(/já há jogos começados/i)).toBeTruthy();
    expect(card.getByLabelText("Remover Grupo A").disabled).toBe(true);
  });

  it("gera a fase final a partir dos grupos e mostra-a no quadro", () => {
    render(<Harness published={published()} />);
    const finals = within(screen.getByText("Fase final", { selector: "h3" }).closest("div.rounded-2xl"));
    fireEvent.click(finals.getByRole("button", { name: /gerar fase final/i }));
    expect(finals.getByText("Final")).toBeTruthy();
    expect(finals.getByText("Vencedor Grupo B")).toBeTruthy();
    expect(lastEdits[0]).toMatchObject({ type: "replaceMatches", group: "Finais" });
  });

  it("gerar de novo pede confirmação e não faz nada se o admin cancelar", () => {
    const state = published();
    state.groups.Voleibol.B = { teams: ["X", "Y"], matches: [match("B1", "X", "Y")] };
    render(<Harness published={state} />);
    window.confirm.mockReturnValue(false);
    fireEvent.click(within(groupCard("B")).getByRole("button", { name: /gerar de novo/i }));
    expect(window.confirm).toHaveBeenCalledWith("Substituir os 1 jogos do Grupo B pelo quadro gerado?");
    expect(lastEdits).toEqual([]);
  });

  it("acrescenta um grupo com a letra seguinte e uma modalidade nova", () => {
    render(<Harness published={published()} />);
    fireEvent.click(screen.getByRole("button", { name: /grupo c/i }));
    expect(groupCard("C")).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText(/nova modalidade/i), { target: { value: "Andebol" } });
    fireEvent.click(screen.getByLabelText("Acrescentar modalidade"));
    expect(screen.getByText("Andebol")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText(/nova modalidade/i), { target: { value: "Voleibol" } });
    expect(screen.getByText("Já existe.")).toBeTruthy();
  });

  it("muda o nome do torneio", () => {
    render(<Harness published={published()} />);
    fireEvent.change(screen.getByPlaceholderText("Gata na Praia"), { target: { value: "Taça AAUM" } });
    expect(lastEdits).toEqual([{ type: "settings", field: "name", from: "", to: "Taça AAUM" }]);
  });
});
