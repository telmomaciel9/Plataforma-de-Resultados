"use client";
import React, { useState } from "react";
import { competitionId, newCompetition, validateNewCompetition } from "@/lib/tournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/ui";
import config from "@/tournament.config.json";

const input = "w-full p-3 rounded-xl bg-slate-50 ring-2 ring-slate-100 focus:ring-indigo-500 outline-none text-sm font-bold";
const label = "text-[10px] font-black uppercase tracking-widest text-slate-400";

/**
 * Formulário de nova competição. onCreate({ id, state }) grava (pode falhar com uma
 * mensagem para o admin); as equipas e os jogos configuram-se depois na competição.
 */
export function NewCompetitionForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [edition, setEdition] = useState("");
  const [modalities, setModalities] = useState(config.modalities.join(", "));
  const [groupCount, setGroupCount] = useState(config.groups.length);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fields = { name, edition, modalities: modalities.split(","), groupCount: Number(groupCount) };
  const problems = validateNewCompetition(fields);
  const id = competitionId(name, edition);

  const submit = async (e) => {
    e.preventDefault();
    if (problems.length) return;
    setSaving(true);
    setError(null);
    try {
      await onCreate(newCompetition(fields));
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Nova competição</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className={label}>Nome</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Taça AAUM" className={`${input} mt-1`} autoFocus />
          </label>
          <label className="block">
            <span className={label}>Edição</span>
            <input value={edition} onChange={e => setEdition(e.target.value)} placeholder="Ex.: '27 ou 2026/27" className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>Modalidades (separadas por vírgulas)</span>
            <input value={modalities} onChange={e => setModalities(e.target.value)} className={`${input} mt-1`} />
          </label>
          <label className="block">
            <span className={label}>Grupos por modalidade</span>
            <select value={groupCount} onChange={e => setGroupCount(e.target.value)} className={`${input} mt-1`}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} {n === 1 ? "grupo" : "grupos"}</option>)}
            </select>
          </label>
          {id && <p className="text-xs text-slate-500">Endereço: <span className="font-bold text-slate-700">/c/{id}</span></p>}
          {name.trim() && problems.length > 0 && (
            <ul className="text-xs font-bold text-red-600 space-y-1">{problems.map(p => <li key={p}>{p}</li>)}</ul>
          )}
          {error && <p role="alert" className="text-xs font-bold text-red-600">{error}</p>}
          <p className="text-xs text-slate-400">
            Depois de criar, abre-se a competição em Admin → Torneio e equipas para pores as equipas e gerares os jogos.
          </p>
          <div className="flex gap-2">
            <button type="submit" disabled={saving || problems.length > 0} className="flex-1 bg-indigo-600 text-white p-3 rounded-xl font-black uppercase tracking-widest text-xs disabled:opacity-40">
              {saving ? "A criar..." : "Criar competição"}
            </button>
            <button type="button" onClick={onCancel} className="px-4 rounded-xl bg-slate-100 text-slate-500 font-bold text-sm">Cancelar</button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
