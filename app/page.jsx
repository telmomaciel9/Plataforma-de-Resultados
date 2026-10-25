"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Trophy, RefreshCw, Lock, LogOut, Plus, Save, Trash2, Edit3
} from "lucide-react";
import { addEdit, applyEdits, publishEdits, resolveTournament, winnerOf } from "@/lib/tournament";
import { appStateStore, loadAppState, subscribeToAppState, supabase } from "@/lib/appState";

const GROUPS = ["A", "B", "C", "D"];

// --- COMPONENTES VISUAIS ESTILIZADOS ---
const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>{children}</div>;
const CardHeader = ({ children, className = "" }) => <div className={`p-4 border-b border-slate-50 flex justify-between items-center ${className}`}>{children}</div>;
const CardTitle = ({ children, className = "" }) => <h3 className={`font-bold text-slate-800 text-sm uppercase tracking-widest ${className}`}>{children}</h3>;
const CardContent = ({ children, className = "" }) => <div className={`p-4 ${className}`}>{children}</div>;
const Badge = ({ children, className = "" }) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 ${className}`}>{children}</span>;

const defaultStage = (group) => (group === "Finais" ? "Final" : "Ronda 1");
const scoreText = (score) => (score === "" || score === null || score === undefined ? "–" : score);

function matchesOf(state, modality, group) {
  if (!state) return [];
  return group === "Finais"
    ? state.finals?.[modality] || []
    : state.groups?.[modality]?.[group]?.matches || [];
}

function describeConflict({ edit, reason, current }) {
  if (reason === "missing") return `Um jogo que alteraste já tinha sido apagado por outro admin (${edit.matchId}).`;
  return `${edit.matchId}: outro admin tinha mudado "${current}"; ficou o teu valor "${edit.to}".`;
}

export default function Page() {
  // published = o que está no Supabase (separador Público), atualizado em tempo real.
  // edits = alterações do admin por publicar; o rascunho é published + edits, por isso
  // o que outros admins publicam aparece logo no rascunho sem perder as edições.
  const [published, setPublished] = useState(null);
  const [edits, setEdits] = useState([]);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("public");
  const [modality, setModality] = useState("Voleibol");
  const [group, setGroup] = useState("A");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newMatch, setNewMatch] = useState({ home: "", away: "", stage: defaultStage("A") });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [loginError, setLoginError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);

  const dirty = edits.length > 0;

  const fetchData = useCallback(async () => {
    try {
      const { state } = await loadAppState();
      setPublished(state);
      setLoadError(null);
    } catch (error) {
      setLoadError(error.message);
    }
  }, []);

  useEffect(() => {
    fetchData();
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    const unsubscribe = subscribeToAppState(({ state }) => setPublished(state), setLive);
    // Telemóveis cortam a ligação em segundo plano: ao voltar à página, vai buscar o mais recente.
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      authListener.subscription.unsubscribe();
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  // Avisa antes de fechar ou recarregar a página com alterações por publicar.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const saveAll = async () => {
    setSaving(true);
    try {
      const result = await publishEdits(appStateStore, edits);
      if (!result.ok) {
        alert("Outros admins estão a publicar ao mesmo tempo. As tuas alterações continuam aqui; tenta de novo.");
        return;
      }
      setPublished(result.state);
      setEdits([]);
      alert(result.conflicts.length
        ? "Publicado, mas com avisos:\n\n" + result.conflicts.map(describeConflict).join("\n")
        : "Alterações publicadas com sucesso!");
    } catch (error) {
      alert("Erro ao guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const login = async (e) => {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword(loginForm);
    setLoggingIn(false);
    if (error) setLoginError(error.message === "Invalid login credentials" ? "Email ou password incorretos." : error.message);
  };

  const draft = useMemo(() => (published ? applyEdits(published, edits).state : null), [published, edits]);

  const updateMatch = (match, field, value) =>
    setEdits((list) => addEdit(list, { type: "update", matchId: match.id, field, from: match[field] ?? "", to: value }));

  const addMatch = () => {
    const id = `${modality[0]}-${group[0]}-${Date.now()}`;
    const match = { ...newMatch, id, homeScore: "", awayScore: "" };
    setEdits((list) => addEdit(list, { type: "add", modality, group, match }));
    setShowAddModal(false);
    setNewMatch({ home: "", away: "", stage: defaultStage(group) });
  };

  const deleteMatch = (matchId) => {
    if (!confirm("Apagar este jogo?")) return;
    setEdits((list) => addEdit(list, { type: "delete", matchId }));
  };

  const discardEdits = () => {
    if (confirm("Descartar todas as alterações por publicar?")) setEdits([]);
  };

  const changeGroup = (value) => {
    setGroup(value);
    setNewMatch((m) => ({ ...m, stage: defaultStage(value) }));
  };

  const resolved = useMemo(() => (published ? resolveTournament(published) : null), [published]);

  if (loadError && !published) {
    return (
      <div className="p-10 text-center font-sans space-y-4">
        <p className="font-bold">Não foi possível carregar o torneio.</p>
        <p className="text-sm text-slate-500">{loadError}</p>
        <button onClick={fetchData} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Tentar de novo</button>
      </div>
    );
  }
  if (!published) return <div className="p-10 text-center font-bold font-sans">A carregar torneio...</div>;

  const modalities = published.modalities || Object.keys(published.groups || {});
  const publicMatches = matchesOf(resolved, modality, group);
  const draftMatches = matchesOf(draft, modality, group);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      {/* HEADER DINÂMICO */}
      <div className="bg-indigo-700 p-8 pt-12 pb-10 text-white rounded-b-[40px] shadow-2xl mb-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Trophy size={180} /></div>
        <div className="relative z-10 flex justify-between items-start">
          <div>
            <Badge className="bg-indigo-500/40 text-white border-none mb-2 tracking-widest">GATA NA PRAIA &apos;26</Badge>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic">Resultados</h1>
          </div>
          {user && (
            <button onClick={() => supabase.auth.signOut()} aria-label="Terminar sessão" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 space-y-6 max-w-md mx-auto">
        {/* TAB SWITCHER */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
          <button onClick={() => setTab("public")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${tab === "public" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>PÚBLICO</button>
          <button onClick={() => setTab("admin")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${tab === "admin" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>ADMIN</button>
        </div>

        {/* SELETORES DE FILTRO */}
        <div className="grid grid-cols-2 gap-3">
          <select value={modality} onChange={(e) => setModality(e.target.value)} className="bg-white p-4 rounded-2xl shadow-sm font-bold text-sm outline-none border-none ring-2 ring-transparent focus:ring-indigo-500 transition-all">
            {modalities.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={group} onChange={(e) => changeGroup(e.target.value)} className="bg-white p-4 rounded-2xl shadow-sm font-bold text-sm outline-none border-none ring-2 ring-transparent focus:ring-indigo-500 transition-all">
            {GROUPS.map(g => <option key={g} value={g}>Grupo {g}</option>)}
            <option value="Finais" className="text-indigo-600 font-bold">🏆 FINAIS</option>
          </select>
        </div>

        {tab === "public" ? (
          <Card>
            <CardHeader>
                <CardTitle>{modality} — {group === "Finais" ? "Fase Final" : `Grupo ${group}`}</CardTitle>
                {live ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600" title="Os resultados atualizam-se sozinhos">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Ao vivo
                  </span>
                ) : (
                  <button onClick={fetchData} aria-label="Atualizar resultados" className="text-slate-400 hover:text-indigo-600 transition-colors">
                    <RefreshCw size={14} />
                  </button>
                )}
            </CardHeader>
            <CardContent className="divide-y divide-slate-50">
              {publicMatches.length > 0 ? publicMatches.map(m => {
                const winner = winnerOf(m);
                return (
                  <div key={m.id} className="py-5 first:pt-0 last:pb-0">
                    <div className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">{m.stage}</div>
                    {[[m.home, m.homeScore], [m.away, m.awayScore]].map(([team, score], i) => (
                      <div key={i} className={`flex justify-between items-center ${i ? "mt-1" : ""}`}>
                        <span className={`font-bold ${winner && winner !== team ? "text-slate-400" : "text-slate-700"}`}>{team}</span>
                        <span className={`text-2xl font-black ${winner && winner !== team ? "text-slate-300" : "text-indigo-900"}`}>{scoreText(score)}</span>
                      </div>
                    ))}
                  </div>
                );
              }) : <div className="text-center py-10 text-slate-400 text-sm italic font-medium">Nenhum jogo registado aqui.</div>}
              {loadError && <p role="alert" className="pt-4 text-xs text-red-600 text-center">Não foi possível atualizar: {loadError}</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {!user ? (
              <Card className="p-6">
                <form onSubmit={login}>
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><Lock size={18} className="text-indigo-600"/> Acesso Reservado</h3>
                  <input type="email" required autoComplete="username" placeholder="Email" className="w-full p-4 rounded-xl bg-slate-50 border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none mb-3 text-sm" onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
                  <input type="password" required autoComplete="current-password" placeholder="Password" className="w-full p-4 rounded-xl bg-slate-50 border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none mb-4 text-sm" onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
                  {loginError && <p role="alert" className="text-sm text-red-600 font-medium mb-4">{loginError}</p>}
                  <button type="submit" disabled={loggingIn} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-black shadow-lg shadow-indigo-100 active:scale-95 transition-all disabled:opacity-60">{loggingIn ? "A ENTRAR..." : "ENTRAR"}</button>
                </form>
              </Card>
            ) : (
              <>
                <div className="flex gap-2">
                  <button onClick={() => setShowAddModal(true)} className="flex-[2] bg-white border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 transition-all">
                    <Plus size={18} /> Novo Jogo ({group})
                  </button>
                  <button onClick={saveAll} disabled={saving || !dirty} className="flex-1 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                    <Save size={18} /> {saving ? "..." : "PUBLICAR"}
                  </button>
                </div>
                {dirty && (
                  <p className="text-xs font-bold text-amber-600 text-center">
                    {edits.length === 1 ? "1 alteração por publicar." : `${edits.length} alterações por publicar.`}{" "}
                    <button onClick={discardEdits} className="underline text-slate-500 hover:text-red-600">Descartar</button>
                  </p>
                )}

                <div className="space-y-3">
                  {draftMatches.map(m => (
                    <Card key={m.id} className="p-4 bg-white relative border-l-4 border-l-indigo-500">
                      <button onClick={() => deleteMatch(m.id)} aria-label="Apagar jogo" className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>

                      <div className="flex items-center gap-2 mb-3">
                        <Edit3 size={12} className="text-slate-400" />
                        <input value={m.stage} onChange={e => updateMatch(m,'stage', e.target.value)} className="text-[10px] font-black text-indigo-500 uppercase bg-transparent w-full outline-none" placeholder="EX: FINAL" />
                      </div>

                      <div className="flex items-center gap-4 mb-3">
                        <input value={m.homeScore} inputMode="numeric" onChange={e => updateMatch(m,'homeScore', e.target.value)} className="w-12 h-12 text-center font-black bg-slate-50 rounded-xl ring-2 ring-slate-100 focus:ring-indigo-500 outline-none text-lg" placeholder="–" />
                        <input value={m.home} onChange={e => updateMatch(m,'home', e.target.value)} className="text-sm font-bold text-slate-700 flex-1 bg-transparent border-b border-transparent focus:border-slate-100 outline-none" />
                      </div>
                      <div className="flex items-center gap-4">
                        <input value={m.awayScore} inputMode="numeric" onChange={e => updateMatch(m,'awayScore', e.target.value)} className="w-12 h-12 text-center font-black bg-slate-50 rounded-xl ring-2 ring-slate-100 focus:ring-indigo-500 outline-none text-lg" placeholder="–" />
                        <input value={m.away} onChange={e => updateMatch(m,'away', e.target.value)} className="text-sm font-bold text-slate-700 flex-1 bg-transparent border-b border-transparent focus:border-slate-100 outline-none" />
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA ADICIONAR JOGOS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <h2 className="font-black text-2xl mb-6 tracking-tighter">Novo Jogo em {group}</h2>
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black text-slate-400 ml-1 uppercase">Fase / Ronda</label>
                <input value={newMatch.stage} onChange={e => setNewMatch({...newMatch, stage: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none mt-1 font-bold" placeholder="Ex: Meia-Final" />
              </div>
              <input value={newMatch.home} onChange={e => setNewMatch({...newMatch, home: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none font-bold" placeholder="Equipa Casa" />
              <input value={newMatch.away} onChange={e => setNewMatch({...newMatch, away: e.target.value})} className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-2 ring-slate-100 focus:ring-indigo-500 outline-none font-bold" placeholder="Equipa Visitante" />
              <button onClick={addMatch} className="w-full bg-indigo-600 text-white p-5 rounded-2xl font-black mt-2 shadow-xl shadow-indigo-100 active:scale-95 transition-all uppercase tracking-widest text-xs">Confirmar Jogo</button>
              <button onClick={() => setShowAddModal(false)} className="w-full text-slate-400 font-bold p-2 text-sm">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
