"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star } from "lucide-react";
import { allTeams, findTeam, nextMatch, prospects, teamMatches, teamSlug, tournamentSettings } from "@/lib/tournament";
import config from "@/tournament.config.json";
import { getMyTeam, setMyTeam, useTournament } from "@/lib/useTournament";
import { Card, CardContent, CardHeader, CardTitle, Header, LiveIndicator, LoadingOrError, MatchRow, scoreText } from "@/app/ui";

const OUTCOME = {
  win: { label: "V", title: "Vitória", className: "bg-emerald-100 text-emerald-700" },
  loss: { label: "D", title: "Derrota", className: "bg-red-100 text-red-700" },
  draw: { label: "E", title: "Empate", className: "bg-slate-100 text-slate-600" },
};

export default function TeamPage({ params }) {
  const competition = decodeURIComponent(params.id);
  const slug = decodeURIComponent(params.slug);
  const results = `/c/${competition}`;
  const { published, live, loadError, fetchData } = useTournament(competition);
  const [following, setFollowing] = useState(false);
  useEffect(() => setFollowing(getMyTeam(competition) === slug), [competition, slug]);

  const team = useMemo(() => (published ? findTeam(published, slug) : undefined), [published, slug]);
  const teamSlugs = useMemo(() => new Set(published ? allTeams(published).map(t => t.slug) : []), [published]);
  const matches = useMemo(() => (published && team ? teamMatches(published, team.name) : []), [published, team]);
  const next = nextMatch(matches);
  const ahead = useMemo(() => (published && team ? prospects(published, team.name) : []), [published, team]);

  if (!published) return <LoadingOrError loadError={loadError} onRetry={fetchData} />;

  const settings = tournamentSettings(published, config);

  const teamHref = (name) => (teamSlugs.has(teamSlug(name)) && teamSlug(name) !== slug ? `${results}/equipa/${teamSlug(name)}` : null);
  const toggleFollow = () => {
    setMyTeam(competition, following ? null : slug);
    setFollowing(!following);
  };

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
        <Header title="Equipa" settings={settings} />
        <div className="px-4 max-w-md mx-auto space-y-4 text-center">
          <p className="font-bold">Não encontrámos esta equipa.</p>
          <Link href={results} className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Ver todos os resultados</Link>
        </div>
      </div>
    );
  }

  const played = matches.filter(m => m.status === "played");
  const record = { win: 0, loss: 0, draw: 0 };
  played.forEach(m => { record[m.outcome] += 1; });
  const others = matches.filter(m => m !== next);
  const byModality = team.modalities
    .map(modality => {
      const all = matches.filter(m => m.modality === modality);
      const count = (outcome) => all.filter(m => m.outcome === outcome).length;
      return { modality, list: others.filter(m => m.modality === modality), wins: count("win"), draws: count("draw"), losses: count("loss") };
    })
    .filter(({ list }) => list.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      <Header title={team.name} settings={settings}>
        <button
          onClick={toggleFollow}
          aria-pressed={following}
          aria-label={following ? "Deixar de seguir" : "Seguir esta equipa"}
          className={`p-2 rounded-full transition-all shrink-0 ${following ? "bg-amber-400 text-indigo-900" : "bg-white/10 hover:bg-white/20"}`}
        >
          <Star size={18} fill={following ? "currentColor" : "none"} />
        </button>
      </Header>

      <div className="px-4 space-y-6 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <Link href={results} className="flex items-center gap-1 text-sm font-bold text-indigo-600"><ArrowLeft size={16} /> Resultados</Link>
          <LiveIndicator live={live} onRefresh={fetchData} />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {[["win", "Vitórias"], ["draw", "Empates"], ["loss", "Derrotas"]].map(([key, label]) => (
            <div key={key} className="bg-white rounded-2xl shadow-sm py-3">
              <div className="text-2xl font-black text-indigo-900">{record[key]}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</div>
            </div>
          ))}
        </div>
        <p className="-mt-3 text-center text-xs font-bold text-slate-400">{team.modalities.join(" · ")}</p>

        {next && (
          <Card className={next.status === "live" ? "ring-2 ring-red-200" : ""}>
            <CardHeader><CardTitle>{next.status === "live" ? "A jogar agora" : "Próximo jogo"}</CardTitle></CardHeader>
            <CardContent>
              <MatchRow match={next.match} highlight={team.name} teamHref={teamHref} subtitle={next.modality} className="" />
            </CardContent>
          </Card>
        )}

        {ahead.length > 0 && (
          <Card>
            <CardHeader><CardTitle>E depois?</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ahead.map((p, i) => (
                <p key={i} className="text-sm text-slate-600">
                  <span className={`font-black ${p.condition === "win" ? "text-emerald-600" : "text-red-600"}`}>
                    Se {p.condition === "win" ? "ganhar" : "perder"}
                  </span>{" "}
                  {p.from.match.stage} ({p.from.modality}): joga {p.next.stage}
                  {p.next.time ? ` às ${p.next.time}` : ""} contra <span className="font-bold text-slate-800">{p.opponent}</span>.
                </p>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Os restantes jogos, um cartão por modalidade, com o balanço dessa modalidade. */}
        {byModality.map(({ modality, list, wins, draws, losses }) => (
          <Card key={modality}>
            <CardHeader>
              <CardTitle>{modality}</CardTitle>
              <span className="text-[11px] font-black text-slate-400">{wins}V · {draws}E · {losses}D</span>
            </CardHeader>
            <CardContent className="divide-y divide-slate-50">
              {list.map(m => (
                <div key={m.match.id} className="flex items-start gap-3 py-5 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <MatchRow match={m.match} highlight={team.name} teamHref={teamHref} className="" />
                  </div>
                  {m.outcome && (
                    <span title={OUTCOME[m.outcome].title} className={`mt-7 shrink-0 w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center ${OUTCOME[m.outcome].className}`}>
                      {OUTCOME[m.outcome].label}
                    </span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {matches.length === 0 && <div className="text-center py-6 text-slate-400 text-sm italic font-medium">Ainda sem jogos.</div>}

        {next?.status === "live" && (
          <p className="text-center text-xs font-bold text-slate-400">
            Resultado em direto: {scoreText(next.teamScore)}–{scoreText(next.opponentScore)}. Atualiza sozinho.
          </p>
        )}
      </div>
    </div>
  );
}
