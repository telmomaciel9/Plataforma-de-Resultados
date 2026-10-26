"use client";
import React, { useMemo, useState } from "react";
import { FlaskConical, RotateCcw } from "lucide-react";
import { buildBracket, matchStatus, matchTeams, simulate, winnerOf } from "@/lib/tournament";
import { StatusBadge, scoreText } from "@/app/ui";

const LINE = "bg-slate-300";

/** Um jogo no quadro. Em modo simulação, tocar numa equipa escolhe-a como vencedora. */
function MatchBox({ node, highlight, simulated, onPick, pickable }) {
  const m = node.match;
  const winner = matchStatus(m) === "played" ? winnerOf(m) : null;
  const isSimulated = simulated.has(m.id);
  return (
    <div className={`w-52 shrink-0 rounded-xl border bg-white shadow-sm ${isSimulated ? "border-amber-300 border-dashed" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-2 px-3 pt-2">
        <span className="min-w-0 text-[9px] font-black uppercase leading-tight tracking-widest text-indigo-400">
          {m.stage}{m.time ? ` · ${m.time}` : ""}
        </span>
        {isSimulated
          ? <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Simulado</span>
          : <StatusBadge match={m} />}
      </div>
      <div className="px-1 pb-1 pt-1">
        {["home", "away"].map((side) => {
          const team = m[side];
          const score = side === "home" ? m.homeScore : m.awayScore;
          const won = winner === team;
          const lost = winner && !won;
          const content = (
            <>
              <span className="min-w-0">
                {node.origins[side] && <span className="block truncate text-[9px] font-bold uppercase tracking-wider text-slate-400">{node.origins[side]}</span>}
                <span className={`block truncate text-xs font-bold ${team === highlight ? "text-indigo-700" : lost ? "text-slate-400" : "text-slate-800"}`}>{team}</span>
              </span>
              {isSimulated
                ? won && <span className="text-[10px] font-black text-amber-600">✓</span>
                : <span className={`text-sm font-black ${lost ? "text-slate-300" : "text-indigo-900"}`}>{scoreText(score)}</span>}
            </>
          );
          const className = `flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left ${won ? "bg-indigo-50/60" : ""}`;
          return pickable ? (
            <button key={side} onClick={() => onPick(m, side)} className={`${className} outline-none ring-amber-300 hover:bg-amber-50 focus:ring-2`}>
              {content}
            </button>
          ) : (
            <div key={side} className={className}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Árvore desenhada da esquerda (primeiros jogos) para a direita (último jogo).
 * Cada jogo tem à esquerda os jogos de onde vêm as suas equipas, ligados por linhas:
 * cada filho desenha um traço até à linha vertical, e a linha vertical vai do centro
 * do primeiro filho ao centro do último, seja qual for a altura de cada um.
 */
function BracketTree({ node, isPickable, ...boxProps }) {
  const children = node.children;
  return (
    <div className="flex items-center">
      {children.length > 0 && (
        <>
          <div className="flex flex-col">
            {children.map((child, i) => (
              <div key={child.match.id} className="relative flex items-center py-2 pr-4">
                <BracketTree node={child} isPickable={isPickable} {...boxProps} />
                <span className={`absolute right-0 top-1/2 h-px w-4 ${LINE}`} />
                {children.length > 1 && (
                  <span
                    className={`absolute right-0 w-px ${LINE}`}
                    style={{ top: i === 0 ? "50%" : 0, bottom: i === children.length - 1 ? "50%" : 0 }}
                  />
                )}
              </div>
            ))}
          </div>
          <span className={`h-px w-4 shrink-0 ${LINE}`} />
        </>
      )}
      <MatchBox node={node} pickable={isPickable(node.match)} {...boxProps} />
    </div>
  );
}

/** Quadro de um grupo ou da fase final, com modo de simulação (não grava nada). */
export function BracketView({ state, modality, group, highlight }) {
  const [simulating, setSimulating] = useState(false);
  const [picks, setPicks] = useState({});

  // Estado real de cada jogo: os que já terminaram não se podem simular.
  const realStatus = useMemo(() => {
    const status = new Map();
    [
      ...Object.values(state.groups ?? {}).flatMap(groups => Object.values(groups).flatMap(g => g.matches)),
      ...Object.values(state.finals ?? {}).flat(),
    ].forEach(m => status.set(m.id, matchStatus(m)));
    return status;
  }, [state]);

  const { state: shown, simulated } = useMemo(
    () => (simulating ? simulate(state, picks) : { state, simulated: new Set() }),
    [state, picks, simulating],
  );
  const bracket = useMemo(() => buildBracket(shown, modality, group), [shown, modality, group]);

  const isPickable = (match) => {
    if (!simulating || realStatus.get(match.id) === "played") return false;
    const teams = matchTeams(shown, match.id);
    return !!teams && teams.home !== null && teams.away !== null;
  };
  const onPick = (match, side) => setPicks(p => {
    const next = { ...p };
    if (next[match.id] === side) delete next[match.id];
    else next[match.id] = side;
    return next;
  });

  if (!bracket.root) {
    return <div className="text-center py-10 text-slate-400 text-sm italic font-medium">Nenhum jogo registado aqui.</div>;
  }

  const boxProps = { highlight, simulated, onPick };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setSimulating(s => !s)}
          aria-pressed={simulating}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black uppercase tracking-widest transition-colors ${simulating ? "bg-amber-400 text-indigo-950" : "bg-slate-100 text-slate-500 hover:text-indigo-600"}`}
        >
          <FlaskConical size={14} /> {simulating ? "A simular" : "Simular"}
        </button>
        {simulating && Object.keys(picks).length > 0 && (
          <button onClick={() => setPicks({})} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-red-600">
            <RotateCcw size={12} /> Limpar
          </button>
        )}
      </div>
      {simulating && (
        <p className="text-xs font-medium text-slate-500">
          Toca na equipa que achas que ganha cada jogo por terminar e vê quem avança. Nada é gravado.
        </p>
      )}

      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="inline-block min-w-full">
          <BracketTree node={bracket.root} isPickable={isPickable} {...boxProps} />
        </div>
      </div>
      {bracket.root.children.length > 0 && (
        <p className="md:hidden text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">Desliza para ver o quadro todo →</p>
      )}

      {bracket.others.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outros jogos</div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
            {bracket.others.map(node => (
              <MatchBox key={node.match.id} node={node} pickable={isPickable(node.match)} {...boxProps} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
