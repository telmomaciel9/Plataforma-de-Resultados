// @vitest-environment jsdom
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const auth = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("@/lib/appState", () => ({ supabase: { auth } }));

import { AdminButton } from "./AdminLogin";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("AdminButton", () => {
  it("enquanto a sessão carrega não mostra nada", () => {
    const { container } = render(<AdminButton user={undefined} />);
    expect(container.innerHTML).toBe("");
  });

  it("sem sessão: botão discreto que abre a entrada e fecha", () => {
    render(<AdminButton user={null} />);
    expect(screen.queryByPlaceholderText("Email")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Entrar (organização)" }));
    expect(screen.getByPlaceholderText("Email")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByPlaceholderText("Email")).toBeNull();
  });

  it("entra com email e password e mostra o erro se falhar", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    render(<AdminButton user={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Entrar (organização)" }));
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "admin@exemplo.pt" } });
    fireEvent.change(screen.getByPlaceholderText("Password"), { target: { value: "segredo" } });
    fireEvent.click(screen.getByRole("button", { name: "ENTRAR" }));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "admin@exemplo.pt", password: "segredo" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Email ou password incorretos.");
  });

  it("com sessão: botão para terminar a sessão", () => {
    render(<AdminButton user={{ id: "1" }} />);
    fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
    expect(auth.signOut).toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Entrar (organização)" })).toBeNull();
  });
});
