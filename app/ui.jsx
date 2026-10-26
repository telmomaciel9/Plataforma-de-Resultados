"use client";
import React from "react";
import { RefreshCw, Trophy } from "lucide-react";
import { matchStatus, parseScore, winnerOf } from "@/lib/tournament";
import config from "@/tournament.config.json";

// --- COMPONENTES VISUAIS ESTILIZADOS ---
export const Card = ({ children, className = "" }) => <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>{children}</div>;
export const CardHeader = ({ children, className = "" }) => <div className={`p-4 border-b border-slate-50 flex justify-between items-center ${className}`}>{children}</div>;
export const CardTitle = ({ children, className = "" }) => <h3 className={`font-bold text-slate-800 text-sm uppercase tracking-widest ${className}`}>{children}</h3>;
export const CardContent = ({ children, className = "" }) => <div className={`p-4 ${className}`}>{children}</div>;
export const Badge = ({ children, className = "" }) => <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 ${className}`}>{children}</span>;

export const scoreText = (score) => (score === "" || score === null || score === undefined ? "–" : score);

/** settings: nome e edição do torneio (tournamentSettings); sem settings usa a configuração. */
export function Header({ title, settings = config, children }) {
  return (
    <div className="bg-indigo-700 p-8 pt-12 pb-10 text-white rounded-b-[40px] shadow-2xl mb-6 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 opacity-10 rotate-12"><Trophy size={180} /></div>
      <div className="relative z-10 flex justify-between items-start gap-4">
        <div className="min-w-0">
          <Badge className="bg-indigo-500/40 text-white border-none mb-2 tracking-widest">{settings.name} {settings.edition}</Badge>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic break-words">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

/** "Ao vivo" quando a ligação em tempo real está ativa; senão um botão para atualizar. */
export function LiveIndicator({ live, onRefresh }) {
  if (live) {
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600" title="Os resultados atualizam-se sozinhos">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Ao vivo
      </span>
    );
  }
  return (
    <button onClick={onRefresh} aria-label="Atualizar resultados" className="text-slate-400 hover:text-indigo-600 transition-colors">
      <RefreshCw size={14} />
    </button>
  );
}

export function LoadingOrError({ loadError, onRetry }) {
  if (!loadError) return <div className="p-10 text-center font-bold font-sans">A carregar...</div>;
  return (
    <div className="p-10 text-center font-sans space-y-4">
      <p className="font-bold">Não foi possível carregar a competição.</p>
      <p className="text-sm text-slate-500">{loadError}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={onRetry} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Tentar de novo</button>
        <a href="/" className="bg-slate-100 text-slate-600 px-6 py-3 rounded-xl font-bold">Ver competições</a>
      </div>
    </div>
  );
}

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-600 whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> A decorrer
    </span>
  );
}

export const STATUS_LABELS = { upcoming: "Por começar", live: "A decorrer", played: "Terminado" };

/** Selo do estado do jogo: por começar, a decorrer ou terminado. */
export function StatusBadge({ match }) {
  const status = matchStatus(match);
  if (status === "live") return <LiveBadge />;
  const style = status === "played" ? "bg-slate-100 text-slate-500" : "bg-indigo-50 text-indigo-500";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${style}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/** Um jogo já resolvido: fase, hora, estado, equipas e resultado. highlight destaca uma equipa. */
export function MatchRow({ match: m, highlight, teamHref, subtitle, className = "py-5 first:pt-0 last:pb-0" }) {
  const status = matchStatus(m);
  const winner = status === "played" ? winnerOf(m) : null;
  const wonOnTiebreak = winner && parseScore(m.homeScore) === parseScore(m.awayScore);
  const teamName = (team) => {
    const href = teamHref?.(team);
    const muted = winner && winner !== team;
    const className = `font-bold ${team === highlight ? "text-indigo-700" : muted ? "text-slate-400" : "text-slate-700"}`;
    return href ? <a href={href} className={`${className} hover:underline`}>{team}</a> : <span className={className}>{team}</span>;
  };
  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
          {subtitle ? `${subtitle} · ` : ""}{m.stage}{m.time ? ` · ${m.time}` : ""}
        </div>
        <StatusBadge match={m} />
      </div>
      {[[m.home, m.homeScore], [m.away, m.awayScore]].map(([team, score], i) => (
        <div key={i} className={`flex justify-between items-center gap-3 ${i ? "mt-1" : ""}`}>
          <span className="min-w-0">
            {teamName(team)}
            {wonOnTiebreak && winner === team && <span className="ml-2 text-[10px] font-black uppercase tracking-widest text-amber-600">desempate</span>}
          </span>
          <span className={`text-2xl font-black ${winner && winner !== team ? "text-slate-300" : status === "live" ? "text-red-600" : "text-indigo-900"}`}>{scoreText(score)}</span>
        </div>
      ))}
    </div>
  );
}
