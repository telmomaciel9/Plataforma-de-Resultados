"use client";
import React, { useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, Eye, EyeOff, Plus, Sparkles, Trash2, X } from "lucide-react";
import {
  FINALS, anyStarted, generateFinals, generateGroupMatches, isPlaceholder, modalityTeams, swapTeams, tournamentSettings,
} from "@/lib/tournament";
import { BracketView } from "@/app/Bracket";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui";
import config from "@/tournament.config.json";

const input = "w-full p-3 rounded-xl bg-slate-50 ring-2 ring-slate-100 focus:ring-indigo-500 outline-none text-sm font-bold";
const smallButton = "rounded-lg p-1.5 text-slate-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-slate-400";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** Texto de "N equipas → N-1 jogos" e porque é que não se pode gerar. */
function generateInfo(teams, matches) {
  if (anyStarted(matches)) return { disabled: true, note: "Já há jogos começados ou terminados neste grupo: não se pode gerar de novo." };
  if (teams.length < 2) return { disabled: true, note: "Precisa de pelo menos 2 equipas." };
  return { disabled: false, note: `${teams.length} equipas → ${teams.length - 1} jogos.` };
}

function SettingsSection({ draft, onEdit }) {
  const settings = tournamentSettings(draft, config);
  const fields = [
    ["name", "Nome", "Gata na Praia"],
    ["edition", "Edição", "'27"],
    ["title", "Título da página", "Gata na Praia 2027"],
  ];
  return (
    <Card>
      <CardHeader><CardTitle>Torneio</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {fields.map(([field, label, placeholder]) => (
          <label key={field} className="block">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
            <input
              value={settings[field]}
              placeholder={placeholder}
              onChange={e => onEdit({ type: "settings", field, from: draft.settings?.[field] ?? "", to: e.target.value })}
              className={`${input} mt-1`}
            />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

function ModalitiesSection({ draft, onEdit }) {
  const [name, setName] = useState("");
  const modalities = draft.modalities ?? [];
  const trimmed = name.trim();
  const problem = !trimmed ? null
    : modalities.includes(trimmed) ? "Já existe."
    : trimmed.includes(":") ? "Não pode ter ':'."
    : null;
  const add = () => {
    if (!trimmed || problem) return;
    onEdit({ type: "addModality", modality: trimmed, groups: config.groups });
    setName("");
  };
  const started = (m) => [...Object.values(draft.groups?.[m] ?? {}).map(g => g.matches), draft.finals?.[m] ?? []].some(anyStarted);
  return (
    <Card>
      <CardHeader><CardTitle>Modalidades</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {modalities.map(m => (
            <span key={m} className="flex items-center gap-1 rounded-full bg-indigo-50 pl-3 pr-1 py-1 text-xs font-bold text-indigo-700">
              {m}
              <button
                onClick={() => confirm(`Remover ${m} e todos os seus jogos?`) && onEdit({ type: "removeModality", modality: m })}
                disabled={started(m) || modalities.length === 1}
                title={started(m) ? "Já tem jogos começados" : "Remover"}
                aria-label={`Remover ${m}`}
                className={smallButton}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder="Nova modalidade, ex.: Andebol" className={input} />
          <button onClick={add} disabled={!trimmed || !!problem} className="shrink-0 rounded-xl bg-indigo-600 px-4 text-white font-bold disabled:opacity-40" aria-label="Acrescentar modalidade"><Plus size={18} /></button>
        </div>
        {problem && <p className="text-xs font-bold text-red-600">{problem}</p>}
        <p className="text-xs text-slate-400">Uma modalidade nova começa com os grupos {config.groups.join(", ")}.</p>
      </CardContent>
    </Card>
  );
}

function GroupCard({ draft, published, modality, groupKey, onEdit }) {
  const group = draft.groups[modality][groupKey];
  const teams = group.teams ?? [];
  const [newTeam, setNewTeam] = useState("");
  const [preview, setPreview] = useState(false);
  const started = anyStarted(group.matches);
  const info = generateInfo(teams, group.matches);
  // Equipas que já aparecem nos jogos do grupo (os grupos de 2026 não têm lista própria).
  const fromMatches = [...new Set(group.matches.flatMap(m => [m.home, m.away]))].filter(t => t?.trim() && !isPlaceholder(t));

  const setTeams = (to) => onEdit({ type: "teams", modality, group: groupKey, from: teams, to });
  const move = (i, delta) => {
    const to = [...teams];
    [to[i], to[i + delta]] = [to[i + delta], to[i]];
    setTeams(to);
  };
  const rename = (i, value) => {
    const to = value.trim();
    const from = teams[i];
    if (!to || to === from) return;
    if (teams.includes(to)) { alert(`Já existe a equipa "${to}" neste grupo.`); return; }
    // Muda o nome também nos jogos já criados com esta equipa.
    onEdit({ type: "renameTeam", modality, from, to });
  };
  const addTeam = () => {
    const name = newTeam.trim();
    if (!name) return;
    if (teams.includes(name)) { alert(`Já existe a equipa "${name}" neste grupo.`); return; }
    setTeams([...teams, name]);
    setNewTeam("");
  };
  const generate = () => {
    if (group.matches.length && !confirm(`Substituir os ${group.matches.length} jogos do Grupo ${groupKey} pelo quadro gerado?`)) return;
    const from = (published.groups?.[modality]?.[groupKey]?.matches ?? []).map(m => m.id);
    onEdit({ type: "replaceMatches", modality, group: groupKey, from, matches: generateGroupMatches(modality, groupKey, teams) });
    setPreview(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grupo {groupKey}</CardTitle>
        <button
          onClick={() => confirm(`Remover o Grupo ${groupKey}${group.matches.length ? ` e os seus ${group.matches.length} jogos` : ""}?`) && onEdit({ type: "removeGroup", modality, group: groupKey })}
          disabled={started}
          title={started ? "Já tem jogos começados" : "Remover grupo"}
          aria-label={`Remover Grupo ${groupKey}`}
          className={smallButton}
        >
          <Trash2 size={16} />
        </button>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-1.5">
          {teams.map((team, i) => (
            <li key={`${team}-${i}`} className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-right text-[11px] font-black text-slate-300">{i + 1}</span>
              <input defaultValue={team} aria-label={`Equipa ${i + 1}`} onBlur={e => rename(i, e.target.value)} onKeyDown={e => e.key === "Enter" && e.currentTarget.blur()} className="flex-1 min-w-0 rounded-lg bg-slate-50 px-2 py-1.5 text-sm font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500" />
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className={smallButton}><ArrowUp size={14} /></button>
              <button onClick={() => move(i, 1)} disabled={i === teams.length - 1} aria-label="Descer" className={smallButton}><ArrowDown size={14} /></button>
              <button onClick={() => setTeams(teams.filter((_, j) => j !== i))} aria-label={`Remover ${team}`} className={`${smallButton} hover:text-red-600`}><X size={14} /></button>
            </li>
          ))}
        </ol>
        {teams.length === 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs italic text-slate-400">Ainda sem equipas.</p>
            {fromMatches.length > 0 && (
              <button onClick={() => setTeams(fromMatches)} className="text-xs font-bold text-indigo-600 underline">
                Usar as {fromMatches.length} equipas dos jogos
              </button>
            )}
          </div>
        )}
        <div className="flex gap-2">
          <input value={newTeam} onChange={e => setNewTeam(e.target.value)} onKeyDown={e => e.key === "Enter" && addTeam()} placeholder="Nova equipa" className={input} />
          <button onClick={addTeam} disabled={!newTeam.trim()} className="shrink-0 rounded-xl bg-indigo-600 px-4 text-white font-bold disabled:opacity-40" aria-label="Acrescentar equipa"><Plus size={18} /></button>
        </div>
        <p className="text-xs text-slate-400">A ordem é a de cabeça de série: se o número de equipas não for 2, 4, 8 ou 16, as primeiras ficam isentas na 1.ª ronda.</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button onClick={generate} disabled={info.disabled} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40">
            <Sparkles size={14} /> {group.matches.length ? "Gerar de novo" : "Gerar jogos"}
          </button>
          {group.matches.length > 0 && (
            <button onClick={() => setPreview(p => !p)} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
              {preview ? <EyeOff size={14} /> : <Eye size={14} />} Quadro
            </button>
          )}
          <span className="text-xs font-bold text-slate-400">{info.note}</span>
        </div>
        {preview && group.matches.length > 0 && <BracketView state={draft} modality={modality} group={groupKey} />}
      </CardContent>
    </Card>
  );
}

/** Troca duas equipas de lugar nos jogos por começar (por exemplo, depois de gerar o quadro). */
function SwapCard({ draft, modality, onEdit }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [message, setMessage] = useState(null);
  const teams = modalityTeams(draft, modality);
  const swap = () => {
    const result = swapTeams(draft, modality, a, b);
    result.edits.forEach(onEdit);
    setMessage(
      `Trocadas em ${result.changedMatches} ${result.changedMatches === 1 ? "jogo" : "jogos"}` +
      (result.skippedMatches ? `; ${result.skippedMatches} já começados ficaram como estavam.` : "."),
    );
    setA("");
    setB("");
  };
  if (teams.length < 2) return null;
  const select = (value, set, label) => (
    <select value={value} onChange={e => { set(e.target.value); setMessage(null); }} aria-label={label} className={`${input} truncate`}>
      <option value="">{label}…</option>
      {teams.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
  return (
    <Card>
      <CardHeader><CardTitle>Trocar equipas</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Troca duas equipas de lugar em todos os jogos de {modality} ainda por começar e nas listas dos grupos, mesmo que estejam em grupos diferentes.
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {select(a, setA, "Equipa")}
          <ArrowLeftRight size={16} className="text-slate-400" />
          {select(b, setB, "Trocar com")}
        </div>
        <button onClick={swap} disabled={!a || !b || a === b} className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40">
          <ArrowLeftRight size={14} /> Trocar
        </button>
        {message && <p role="status" className="text-xs font-bold text-emerald-700">{message}</p>}
      </CardContent>
    </Card>
  );
}

function FinalsCard({ draft, published, modality, groupKeys, onEdit }) {
  const [preview, setPreview] = useState(false);
  const finals = draft.finals?.[modality] ?? [];
  const started = anyStarted(finals);
  const disabled = started || groupKeys.length < 2;
  const generate = () => {
    if (finals.length && !confirm(`Substituir os ${finals.length} jogos da fase final de ${modality}?`)) return;
    const from = (published.finals?.[modality] ?? []).map(m => m.id);
    onEdit({ type: "replaceMatches", modality, group: FINALS, from, matches: generateFinals(modality, groupKeys) });
    setPreview(true);
  };
  return (
    <Card>
      <CardHeader><CardTitle>Fase final</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-500">
          Gera a eliminatória entre os vencedores dos grupos ({groupKeys.join(", ") || "nenhum"}): {groupKeys[0]} contra {groupKeys[1] ?? "…"}, e assim por diante,
          com “Vencedor do jogo X” e o 3.º/4.º lugar com “Derrotado do jogo Y”. As equipas aparecem sozinhas à medida que os grupos terminam.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={generate} disabled={disabled} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40">
            <Sparkles size={14} /> {finals.length ? "Gerar de novo" : "Gerar fase final"}
          </button>
          {finals.length > 0 && (
            <button onClick={() => setPreview(p => !p)} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-500">
              {preview ? <EyeOff size={14} /> : <Eye size={14} />} Quadro
            </button>
          )}
          {started && <span className="text-xs font-bold text-slate-400">Já há jogos da fase final começados.</span>}
          {groupKeys.length < 2 && <span className="text-xs font-bold text-slate-400">Precisa de pelo menos 2 grupos.</span>}
        </div>
        {preview && finals.length > 0 && <BracketView state={draft} modality={modality} group={FINALS} />}
      </CardContent>
    </Card>
  );
}

/**
 * Configuração do torneio no admin: textos, modalidades, grupos, equipas e geração
 * automática dos quadros. Tudo fica no rascunho até se carregar em Publicar.
 */
export function TournamentSetup({ draft, published, modality, onEdit }) {
  const groupKeys = Object.keys(draft.groups?.[modality] ?? {});
  const nextLetter = LETTERS.find(l => !groupKeys.includes(l));
  return (
    <div className="space-y-4">
      <p className="text-xs font-medium text-slate-500">
        Tudo o que mudares aqui fica no rascunho até carregares em <b>Publicar</b>. Gerar um quadro substitui os jogos
        desse grupo, por isso só é possível enquanto nenhum jogo do grupo começou.
      </p>
      <SettingsSection draft={draft} onEdit={onEdit} />
      <ModalitiesSection draft={draft} onEdit={onEdit} />

      {draft.modalities?.includes(modality) && (
        <>
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Grupos de {modality}</h2>
            {nextLetter && (
              <button onClick={() => onEdit({ type: "addGroup", modality, group: nextLetter })} className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                <Plus size={14} /> Grupo {nextLetter}
              </button>
            )}
          </div>
          {groupKeys.map(g => (
            <GroupCard key={g} draft={draft} published={published} modality={modality} groupKey={g} onEdit={onEdit} />
          ))}
          <FinalsCard draft={draft} published={published} modality={modality} groupKeys={groupKeys} onEdit={onEdit} />
          <SwapCard draft={draft} modality={modality} onEdit={onEdit} />
        </>
      )}
    </div>
  );
}
