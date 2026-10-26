"use client";
import React, { useState } from "react";
import { KeyRound, Lock, LogOut, X } from "lucide-react";
import { supabase } from "@/lib/appState";
import { Card } from "@/app/ui";

/** Formulário de entrada dos admins (Supabase Auth, email e password). */
export function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const login = async (e) => {
    e.preventDefault();
    setError(null);
    setLoggingIn(true);
    const { error: authError } = await supabase.auth.signInWithPassword(form);
    setLoggingIn(false);
    if (authError) setError(authError.message === "Invalid login credentials" ? "Email ou password incorretos." : authError.message);
  };
  return (
    <Card className="p-6">
      <form onSubmit={login}>
        <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><Lock size={18} className="text-indigo-600"/> Acesso Reservado</h3>
        <input type="email" required autoFocus autoComplete="username" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-50 border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none mb-3 text-sm" onChange={e => setForm({ ...form, email: e.target.value })} />
        <input type="password" required autoComplete="current-password" placeholder="Password" className="w-full p-4 rounded-xl bg-slate-50 border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none mb-4 text-sm" onChange={e => setForm({ ...form, password: e.target.value })} />
        {error && <p role="alert" className="text-sm text-red-600 font-medium mb-4">{error}</p>}
        <button type="submit" disabled={loggingIn} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-60">{loggingIn ? "A ENTRAR..." : "ENTRAR"}</button>
      </form>
    </Card>
  );
}

/**
 * Botão discreto no canto do cabeçalho: sem sessão abre a entrada da organização;
 * com sessão, termina a sessão. user: undefined enquanto a sessão carrega.
 */
export function AdminButton({ user }) {
  const [open, setOpen] = useState(false);
  const iconButton = "bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all shrink-0";

  if (user) {
    return (
      <button onClick={() => supabase.auth.signOut()} aria-label="Terminar sessão" title="Terminar sessão" className={iconButton}>
        <LogOut size={18} />
      </button>
    );
  }
  if (user === undefined) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Entrar (organização)" title="Entrar (organização)" className={`${iconButton} opacity-60 hover:opacity-100`}>
        <KeyRound size={18} />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-4 text-slate-900 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="relative w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
            <AdminLogin />
          </div>
        </div>
      )}
    </>
  );
}
