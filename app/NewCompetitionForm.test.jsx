// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NewCompetitionForm } from "./NewCompetitionForm";

afterEach(cleanup);

const fill = (placeholder, value) => fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });

describe("NewCompetitionForm", () => {
  it("mostra o endereço e cria a competição com grupos e fase final", async () => {
    const onCreate = vi.fn().mockResolvedValue();
    render(<NewCompetitionForm onCreate={onCreate} onCancel={() => {}} />);
    fill("Ex.: Taça AAUM", "Taça AAUM");
    fill("Ex.: '27 ou 2026/27", "'27");
    fireEvent.change(screen.getByDisplayValue("Voleibol, Andebol, Futebol"), { target: { value: "Futsal, Basquetebol" } });
    fireEvent.change(screen.getByDisplayValue("4 grupos"), { target: { value: "2" } });
    expect(screen.getByText("/c/taca-aaum-27")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /criar competição/i }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    const { id, state } = onCreate.mock.calls[0][0];
    expect(id).toBe("taca-aaum-27");
    expect(state.modalities).toEqual(["Futsal", "Basquetebol"]);
    expect(Object.keys(state.groups.Futsal)).toEqual(["A", "B"]);
    expect(state.finals.Basquetebol.map((m) => m.stage)).toEqual(["Final"]);
  });

  it("não deixa criar sem nome nem com modalidades repetidas", () => {
    render(<NewCompetitionForm onCreate={vi.fn()} onCancel={() => {}} />);
    const button = screen.getByRole("button", { name: /criar competição/i });
    expect(button.disabled).toBe(true);
    fill("Ex.: Taça AAUM", "Liga");
    fireEvent.change(screen.getByDisplayValue("Voleibol, Andebol, Futebol"), { target: { value: "Futsal, Futsal" } });
    expect(screen.getByText("Há modalidades repetidas.")).toBeTruthy();
    expect(button.disabled).toBe(true);
  });

  it("mostra o erro de gravação (por exemplo, endereço repetido) e deixa tentar de novo", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Já existe uma competição com este endereço. Muda o nome ou a edição."));
    render(<NewCompetitionForm onCreate={onCreate} onCancel={() => {}} />);
    fill("Ex.: Taça AAUM", "Gata na Praia");
    fireEvent.click(screen.getByRole("button", { name: /criar competição/i }));
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Já existe uma competição com este endereço. Muda o nome ou a edição.");
    expect(screen.getByRole("button", { name: /criar competição/i }).disabled).toBe(false);
  });
});
