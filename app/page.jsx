"use client";
import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, LogOut, Plus, Trophy } from "lucide-react";
import { competitionSummary } from "@/lib/tournament";
import { createCompetition, listCompetitions, supabase } from "@/lib/appState";
import { useAdminUser } from "@/lib/useTournament";
import { Header } from "@/app/ui";
import { AdminLogin } from "@/app/AdminLogin";
import { NewCompetitionForm } from "@/app/NewCompetitionForm";
import config from "@/tournament.config.json";

const platform = { name: config.platformName, edition: "" };

/** Menu inicial: escolher uma competição e, para os admins, criar uma nova. */
export default function CompetitionsMenu() {
  const router = useRouter();
  const user = useAdminUser();
  const [competitions, setCompetitions] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setCompetitions((await listCompetitions()).map(row => competitionSummary(row, config)));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    // Endereços antigos (?modalidade=...&grupo=...) eram da competição de 2026.
    const query = window.location.search;
    if (/[?&](modalidade|grupo|vista)=/.test(query)) {
      router.replace(`/c/${config.id}${query}`);
      return;
    }
    load();
  }, [router, load]);

  const create = async ({ id, state }) => {
    await createCompetition(id, state);
    router.push(`/c/${id}?area=torneio`);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <Header title="Competições" settings={platform}>
        {user && (
          <button onClick={() => supabase.auth.signOut()} aria-label="Terminar sessão" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
            <LogOut size={18} />
          </button>
        )}
      </Header>

      <div className="px-4 space-y-4 max-w-md mx-auto">
        {error && (
          <div className="text-center space-y-3 py-6">
            <p className="font-bold">Não foi possível carregar as competições.</p>
            <p className="text-sm text-slate-500">{error}</p>
            <button onClick={load} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Tentar de novo</button>
          </div>
        )}
        {!competitions && !error && <p className="py-6 text-center font-bold">A carregar...</p>}
        {competitions?.length === 0 && <p className="py-6 text-center text-sm italic text-slate-400">Ainda não há competições.</p>}

        {competitions?.map(c => (
          <Link key={c.id} href={`/c/${c.id}`} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:ring-2 hover:ring-indigo-200 transition-all">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><Trophy size={20} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-black text-slate-800 truncate">{c.name} {c.edition}</span>
              <span className="block text-xs font-bold text-slate-400 truncate">{c.modalities.join(" · ") || "Sem modalidades"}</span>
              {c.updatedAt && <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-300">Atualizada a {c.updatedAt.toLocaleDateString("pt-PT")}</span>}
            </span>
            <ChevronRight size={18} className="text-slate-300 shrink-0" />
          </Link>
        ))}

        <div className="pt-4">
          {user ? (
            creating
              ? <NewCompetitionForm onCreate={create} onCancel={() => setCreating(false)} />
              : (
                <button onClick={() => setCreating(true)} className="w-full bg-white border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 transition-all">
                  <Plus size={18} /> Nova competição
                </button>
              )
          ) : showLogin ? (
            <AdminLogin />
          ) : (
            <button onClick={() => setShowLogin(true)} className="w-full text-center text-xs font-bold text-slate-400 hover:text-indigo-600">
              És da organização? Entrar para criar competições
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
