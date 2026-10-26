"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ChevronRight, LogOut, Plus, Save, Trash2, Edit3, Users
} from "lucide-react";
import {
  addEdit, allTeams, applyEdits, conflictMessage, isPlaceholder, tournamentSettings, matchStatus, matchTeams, needsTiebreak, nextMatch, publishEdits, resolveTournament,
  slotOptions, teamMatches, teamSlug,
} from "@/lib/tournament";
import { competitionStore, supabase } from "@/lib/appState";
import { getMyTeam, setMyTeam, useAdminUser, useTournament } from "@/lib/useTournament";
import {
  Card, CardContent, CardHeader, CardTitle, Header, LiveBadge, LiveIndicator, LoadingOrError, MatchRow, STATUS_LABELS, scoreText,
} from "@/app/ui";
import { AdminLogin } from "@/app/AdminLogin";
import { BracketView } from "@/app/Bracket";
import { TournamentSetup } from "@/app/TournamentSetup";
import config from "@/tournament.config.json";

const defaultStage = (group) => (group === "Finais" ? "Final" : "Ronda 1");

function matchesOf(state, modality, group) {
  if (!state) return [];
  return group === "Finais"
    ? state.finals?.[modality] || []
    : state.groups?.[modality]?.[group]?.matches || [];
}

const NEW_TEAM = "__nova_equipa__";

/**
 * Escolhe um lado do jogo: uma equipa, o vencedor/derrotado de outro jogo ou o vencedor
 * de um grupo. "Nova equipa…" troca para um campo de texto.
 */
function SlotPicker({ value, options, resolved, onChange }) {
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const known = options.some(o => o.value === value);
  const commit = () => {
    if (text.trim()) onChange(text.trim());
    setTyping(false);
    setText("");
  };
  const groups = [
    ["Equipas", options.filter(o => o.kind === "team")],
    ["Vencedor de grupo", options.filter(o => o.kind === "group")],
    ["Vencedor de jogo", options.filter(o => o.kind === "winner")],
    ["Derrotado de jogo", options.filter(o => o.kind === "loser")],
  ].filter(([, list]) => list.length);

  if (typing) {
    return (
      <input
        autoFocus
        value={text}
        placeholder="Nome da equipa"
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setText(""); setTyping(false); }
        }}
        className="flex-1 min-w-0 h-12 text-sm font-bold text-slate-700 bg-slate-50 rounded-xl px-3 ring-2 ring-indigo-500 outline-none"
      />
    );
  }

  return (
    <div className="flex-1 min-w-0">
      <select
        value={value || ""}
        aria-label="Equipa"
        onChange={e => (e.target.value === NEW_TEAM ? setTyping(true) : onChange(e.target.value))}
        className="w-full h-12 text-sm font-bold text-slate-700 bg-transparent border-b border-slate-100 focus:border-indigo-300 outline-none truncate"
      >
        {!value && <option value="">Escolher equipa…</option>}
        {value && !known && <option value={value}>{value}</option>}
        {groups.map(([label, list]) => (
          <optgroup key={label} label={label}>
            {list.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
        <option value={NEW_TEAM}>✎ Nova equipa…</option>
      </select>
      {isPlaceholder(value) && (
        <div className="text-[11px] font-bold text-slate-400 mt-1">→ {resolved ?? "Por definir"}</div>
      )}
    </div>
  );
}

/** Atalho para a equipa que a pessoa segue, ou um seletor para escolher uma. */
function MyTeamCard({ competition, state, teams }) {
  // Lido depois de montar: o localStorage não existe no servidor.
  const [slug, setSlug] = useState(null);
  useEffect(() => setSlug(getMyTeam(competition)), [competition]);
  const href = (teamSlug) => `/c/${competition}/equipa/${teamSlug}`;

  const team = teams.find(t => t.slug === slug);
  if (!team) {
    return (
      <label className="flex items-center gap-3 bg-white rounded-2xl shadow-sm p-4 ring-2 ring-transparent focus-within:ring-indigo-500">
        <Users size={18} className="text-indigo-600 shrink-0" />
        <select
          value=""
          onChange={e => { setMyTeam(competition, e.target.value); window.location.href = href(e.target.value); }}
          className="flex-1 min-w-0 bg-transparent font-bold text-sm outline-none"
        >
          <option value="" disabled>Segue a tua equipa…</option>
          {teams.map(t => <option key={t.slug} value={t.slug}>{t.name}</option>)}
        </select>
      </label>
    );
  }

  const next = nextMatch(teamMatches(state, team.name));
  return (
    <Link href={href(team.slug)} className="block bg-white rounded-2xl shadow-sm p-4 hover:ring-2 hover:ring-indigo-200 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">A minha equipa</div>
          <div className="font-black text-slate-800 truncate">{team.name}</div>
          <div className="text-xs font-bold text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            {next ? (
              <>
                {next.status === "live" ? <LiveBadge /> : <span>Próximo:</span>}
                <span>{next.modality} · {next.match.stage}{next.match.time ? ` · ${next.match.time}` : ""} · vs {next.opponent}</span>
                {next.status === "live" && <span className="text-red-600">{scoreText(next.teamScore)}–{scoreText(next.opponentScore)}</span>}
              </>
            ) : <span>Sem jogos por jogar.</span>}
          </div>
        </div>
        <ChevronRight size={18} className="text-slate-300 shrink-0" />
      </div>
    </Link>
  );
}

export default function CompetitionPage({ params }) {
  const competition = decodeURIComponent(params.id);
  // published = o que está no Supabase (separador Público), atualizado em tempo real.
  // edits = alterações do admin por publicar; o rascunho é published + edits, por isso
  // o que outros admins publicam aparece logo no rascunho sem perder as edições.
  const { published, setPublished, live, loadError, fetchData } = useTournament(competition);
  const [edits, setEdits] = useState([]);
  const [saving, setSaving] = useState(false);
  const user = useAdminUser();
  const [tab, setTab] = useState("public");
  const [view, setView] = useState("list");
  const [adminView, setAdminView] = useState("matches");
  const [modality, setModality] = useState(config.modalities[0]);
  const [group, setGroup] = useState(config.groups[0]);
  const [showAddModal, setShowAddModal] = useState(false);

  const [newMatch, setNewMatch] = useState({ home: "", away: "", stage: defaultStage(config.groups[0]) });

  const dirty = edits.length > 0;

  // Modalidade, grupo e vista ficam no endereço, para se poder partilhar, por exemplo,
  // ?vista=quadro&modalidade=Voleibol&grupo=Finais. ?area=torneio abre o admin na
  // configuração (usado ao criar uma competição).
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("modalidade")) setModality(query.get("modalidade"));
    if (query.get("grupo")) setGroup(query.get("grupo"));
    if (query.get("vista") === "quadro") setView("bracket");
    if (query.get("area") === "torneio") {
      setTab("admin");
      setAdminView("setup");
    }
  }, []);

  useEffect(() => {
    const query = new URLSearchParams({ modalidade: modality, grupo: group });
    if (view === "bracket") query.set("vista", "quadro");
    window.history.replaceState(null, "", `?${query}`);
  }, [modality, group, view]);

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
      const result = await publishEdits(competitionStore(competition), edits);
      if (!result.ok) {
        alert("Outros admins estão a publicar ao mesmo tempo. As tuas alterações continuam aqui; tenta de novo.");
        return;
      }
      setPublished(result.state);
      setEdits([]);
      alert(result.conflicts.length
        ? "Publicado, mas com avisos:\n\n" + result.conflicts.map(conflictMessage).join("\n")
        : "Alterações publicadas com sucesso!");
    } catch (error) {
      alert("Erro ao guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const draft = useMemo(() => (published ? applyEdits(published, edits).state : null), [published, edits]);
  const onEdit = (edit) => setEdits((list) => addEdit(list, edit));

  // No admin mostra-se o rascunho (com modalidades e grupos acabados de criar); no público, o publicado.
  const shown = tab === "admin" && user ? draft : published;
  const modalities = shown?.modalities?.length ? shown.modalities : config.modalities;
  // Sem grupos (competição só com fase final) mostra-se logo a fase final.
  const groups = Object.keys(shown?.groups?.[modality] ?? {});
  const settings = tournamentSettings(published, config);

  // Se a modalidade ou o grupo escolhidos deixarem de existir (removidos ou endereço antigo), passa ao primeiro.
  useEffect(() => {
    if (!shown) return;
    if (!modalities.includes(modality)) setModality(modalities[0]);
    else if (group !== "Finais" && !groups.includes(group)) setGroup(groups[0] ?? "Finais");
  }, [shown, modalities, groups, modality, group]);

  useEffect(() => {
    document.title = settings.title;
  }, [settings.title]);

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
  const teams = useMemo(() => (published ? allTeams(published) : []), [published]);
  const teamSlugs = useMemo(() => new Set(teams.map(t => t.slug)), [teams]);
  const teamHref = (name) => (teamSlugs.has(teamSlug(name)) ? `/c/${competition}/equipa/${teamSlug(name)}` : null);

  if (!published) return <LoadingOrError loadError={loadError} onRetry={fetchData} />;

  const publicMatches = matchesOf(resolved, modality, group);
  const draftMatches = matchesOf(draft, modality, group);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <Header title="Resultados" settings={settings}>
        {user && (
          <button onClick={() => supabase.auth.signOut()} aria-label="Terminar sessão" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-all">
            <LogOut size={18} />
          </button>
        )}
      </Header>

      <div className={`px-4 space-y-6 max-w-md mx-auto ${tab === "public" && view === "bracket" ? "md:max-w-4xl" : ""}`}>
        <Link href="/" className="-mt-2 flex items-center gap-1 text-sm font-bold text-indigo-600"><ArrowLeft size={16} /> Competições</Link>
        {tab === "public" && teams.length > 0 && <MyTeamCard competition={competition} state={published} teams={teams} />}

        {/* TAB SWITCHER */}
        <div className="flex bg-slate-200/50 p-1.5 rounded-2xl">
          <button onClick={() => setTab("public")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${tab === "public" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>PÚBLICO</button>
          <button onClick={() => setTab("admin")} className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${tab === "admin" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>ADMIN</button>
        </div>

        {/* SELETORES DE FILTRO */}
        <div className={`grid gap-3 ${groups.length ? "grid-cols-2" : "grid-cols-1"}`}>
          <select value={modality} onChange={(e) => setModality(e.target.value)} className="bg-white p-4 rounded-2xl shadow-sm font-bold text-sm outline-none border-none ring-2 ring-transparent focus:ring-indigo-500 transition-all">
            {modalities.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          {groups.length > 0 && (
            <select value={group} onChange={(e) => changeGroup(e.target.value)} className="bg-white p-4 rounded-2xl shadow-sm font-bold text-sm outline-none border-none ring-2 ring-transparent focus:ring-indigo-500 transition-all">
              {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
              <option value="Finais" className="text-indigo-600 font-bold">🏆 FINAIS</option>
            </select>
          )}
        </div>

        {tab === "public" ? (
          <Card>
            <CardHeader className="flex-wrap gap-2">
                <CardTitle>{modality} — {group === "Finais" ? "Fase Final" : `Grupo ${group}`}</CardTitle>
                <div className="flex items-center gap-3 ml-auto">
                  <div className="flex rounded-lg bg-slate-100 p-0.5" role="group" aria-label="Vista">
                    {[["list", "Lista"], ["bracket", "Quadro"]].map(([key, label]) => (
                      <button key={key} onClick={() => setView(key)} aria-pressed={view === key} className={`rounded-md px-2 py-1 text-[10px] font-black uppercase tracking-widest ${view === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-400"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <LiveIndicator live={live} onRefresh={fetchData} />
                </div>
            </CardHeader>
            <CardContent className={view === "list" ? "divide-y divide-slate-50" : ""}>
              {view === "bracket"
                ? <BracketView state={published} modality={modality} group={group} />
                : publicMatches.length > 0
                  ? publicMatches.map(m => <MatchRow key={m.id} match={m} teamHref={teamHref} />)
                  : <div className="text-center py-10 text-slate-400 text-sm italic font-medium">Nenhum jogo registado aqui.</div>}
              {loadError && <p role="alert" className="pt-4 text-xs text-red-600 text-center">Não foi possível atualizar: {loadError}</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {!user ? (
              <AdminLogin />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/50 p-1" role="group" aria-label="Área do admin">
                  {[["matches", "Jogos"], ["setup", "Torneio e equipas"]].map(([key, label]) => (
                    <button key={key} onClick={() => setAdminView(key)} aria-pressed={adminView === key} className={`rounded-lg py-2 text-[11px] font-black uppercase tracking-widest ${adminView === key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  {adminView === "matches" && (
                    <button onClick={() => setShowAddModal(true)} className="flex-[2] bg-white border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-500 font-bold text-sm hover:border-indigo-300 hover:text-indigo-500 transition-all">
                      <Plus size={18} /> Novo Jogo ({group})
                    </button>
                  )}
                  <button onClick={saveAll} disabled={saving || !dirty} className="flex-1 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 py-4">
                    <Save size={18} /> {saving ? "..." : "PUBLICAR"}
                  </button>
                </div>
                {dirty && (
                  <p className="text-xs font-bold text-amber-600 text-center">
                    {edits.length === 1 ? "1 alteração por publicar." : `${edits.length} alterações por publicar.`}{" "}
                    <button onClick={discardEdits} className="underline text-slate-500 hover:text-red-600">Descartar</button>
                  </p>
                )}

                {adminView === "setup" && <TournamentSetup draft={draft} published={published} modality={modality} onEdit={onEdit} />}

                <div className={`space-y-3 ${adminView === "matches" ? "" : "hidden"}`}>
                  {draftMatches.map(m => (
                    <Card key={m.id} className="p-4 bg-white relative border-l-4 border-l-indigo-500">
                      <button onClick={() => deleteMatch(m.id)} aria-label="Apagar jogo" className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>

                      <div className="flex items-center gap-2 mb-3 pr-6">
                        <Edit3 size={12} className="text-slate-400 shrink-0" />
                        <input value={m.stage} onChange={e => updateMatch(m, 'stage', e.target.value)} className="text-[10px] font-black text-indigo-500 uppercase bg-transparent flex-1 min-w-0 outline-none" placeholder="EX: FINAL" />
                        <input type="time" value={m.time || ""} aria-label="Hora" onChange={e => updateMatch(m, 'time', e.target.value)} className="text-xs font-bold text-slate-500 bg-slate-50 rounded-lg px-2 py-1 outline-none ring-2 ring-slate-100 focus:ring-indigo-500" />
                      </div>

                      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 mb-3" role="group" aria-label="Estado do jogo">
                        {[["upcoming", "upcoming", "bg-white text-indigo-700"], ["live", "live", "bg-red-600 text-white"], ["played", "finished", "bg-slate-700 text-white"]].map(([key, value, active]) => {
                          const current = matchStatus(m);
                          return (
                            <button
                              key={key}
                              onClick={() => updateMatch(m, 'status', value)}
                              aria-pressed={current === key}
                              className={`rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${current === key ? `${active} shadow-sm` : "text-slate-400 hover:text-slate-600"}`}
                            >
                              {STATUS_LABELS[key]}
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const options = slotOptions(draft, modality, m.id);
                        const teams = matchTeams(draft, m.id);
                        return (
                          <>
                            {[["home", "homeScore"], ["away", "awayScore"]].map(([side, scoreField], i) => (
                              <div key={side} className={`flex items-start gap-4 ${i ? "" : "mb-3"}`}>
                                <input value={m[scoreField]} inputMode="numeric" aria-label="Resultado" onChange={e => updateMatch(m, scoreField, e.target.value)} className="w-12 h-12 shrink-0 text-center font-black bg-slate-50 rounded-xl ring-2 ring-slate-100 focus:ring-indigo-500 outline-none text-lg" placeholder="–" />
                                <SlotPicker value={m[side]} options={options} resolved={teams?.[side]} onChange={value => updateMatch(m, side, value)} />
                              </div>
                            ))}
                            {needsTiebreak(draft, m) && (
                              <label className="mt-3 flex items-center gap-2 text-xs font-bold text-amber-700">
                                Empate: quem ganhou o desempate?
                                <select value={m.tiebreakWinner || ""} onChange={e => updateMatch(m, "tiebreakWinner", e.target.value)} className="flex-1 min-w-0 bg-amber-50 rounded-lg p-2 outline-none ring-2 ring-amber-100 focus:ring-amber-400">
                                  <option value="">Escolher…</option>
                                  <option value={teams.home}>{teams.home}</option>
                                  <option value={teams.away}>{teams.away}</option>
                                </select>
                              </label>
                            )}
                          </>
                        );
                      })()}
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
