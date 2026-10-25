"use client";
import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Trophy, Volleyball, Goal, Hand, Medal, Wifi, WifiOff, Lock, LogOut, RefreshCw, ChevronRight } from "lucide-react";

// Configuração do Supabase
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const STORAGE_KEY = "gata-na-praia-2026-mobile";
const STATE_ROW_ID = "gata-na-praia-2026-official";

// Dados iniciais do torneio
const initialTournament = {
  modalities: ["Voleibol", "Andebol", "Futebol"],
  groups: {
    Voleibol: {
      A: {
        teams: ["24 - all cool", "12 - Mamas Industriais", "5 - A Ganza está na Areia", "6 - Fistoum", "9 - Reabilitação cancelada", "19 - Sede Máxima"],
        matches: [
          { id: "VB-A-J1", stage: "Grupo A", home: "5 - A Ganza está na Areia", away: "6 - Fistoum", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-A-J2", stage: "Grupo A", home: "9 - Reabilitação cancelada", away: "19 - Sede Máxima", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-A-SF1", stage: "Grupo A", home: "24 - all cool", away: "WIN:VB-A-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-A-SF2", stage: "Grupo A", home: "12 - Mamas Industriais", away: "WIN:VB-A-J2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-A-F", stage: "Grupo A", home: "WIN:VB-A-SF1", away: "WIN:VB-A-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
        ],
      },
      B: {
        teams: ["1 - Atirei o pau à gata", "10 - O João é um fdp", "15 - Trupe dos Lambões", "16 - Boyca and company", "17 - SOS", "18 - Aboubacrew", "14 - Havaianas"],
        matches: [
          { id: "VB-B-J1", stage: "Grupo B", home: "1 - Atirei o pau à gata", away: "10 - O João é um fdp", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-B-J2", stage: "Grupo B", home: "15 - Trupe dos Lambões", away: "16 - Boyca and company", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-B-J3", stage: "Grupo B", home: "17 - SOS", away: "18 - Aboubacrew", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-B-SF1", stage: "Grupo B", home: "14 - Havaianas", away: "WIN:VB-B-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-B-SF2", stage: "Grupo B", home: "WIN:VB-B-J2", away: "WIN:VB-B-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-B-F", stage: "Grupo B", home: "WIN:VB-B-SF1", away: "WIN:VB-B-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
        ],
      },
      C: {
        teams: ["3 - Os filhos do recluso", "4 - 100abrigos", "7 - Equipa do Tinoni", "8 - Boteco", "11 - Zé Longuinho", "13 - -1Guerreiro", "20 - Niguiris FC"],
        matches: [
          { id: "VB-C-J1", stage: "Grupo C", home: "3 - Os filhos do recluso", away: "4 - 100abrigos", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-C-J2", stage: "Grupo C", home: "7 - Equipa do Tinoni", away: "8 - Boteco", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-C-J3", stage: "Grupo C", home: "11 - Zé Longuinho", away: "13 - -1Guerreiro", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-C-SF1", stage: "Grupo C", home: "20 - Niguiris FC", away: "WIN:VB-C-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-C-SF2", stage: "Grupo C", home: "WIN:VB-C-J2", away: "WIN:VB-C-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-C-F", stage: "Grupo C", home: "WIN:VB-C-SF1", away: "WIN:VB-C-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
        ],
      },
      D: {
        teams: ["2 - DeGatas", "21 - Manchester e um Nite", "22 - Tasqueiros da Moita", "23 - Traficantes da reboleira", "25 - Sokago nomar", "27 - Habemus Cunnus", "26 - Repetida"],
        matches: [
          { id: "VB-D-J1", stage: "Grupo D", home: "2 - DeGatas", away: "21 - Manchester e um Nite", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-D-J2", stage: "Grupo D", home: "22 - Tasqueiros da Moita", away: "23 - Traficantes da reboleira", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-D-J3", stage: "Grupo D", home: "25 - Sokago nomar", away: "27 - Habemus Cunnus", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-D-SF1", stage: "Grupo D", home: "26 - Repetida", away: "WIN:VB-D-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-D-SF2", stage: "Grupo D", home: "WIN:VB-D-J2", away: "WIN:VB-D-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
          { id: "VB-D-F", stage: "Grupo D", home: "WIN:VB-D-SF1", away: "WIN:VB-D-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
        ],
      },
    },
    Andebol: {
        A: {
          teams: ["13 - -1Guerreiro", "27 - Habemus Cunnus", "3 - Os filhos do recluso", "5 - A Ganza está na Areia", "19 - Sede Máxima", "25 - Sokago nomar"],
          matches: [
            { id: "AN-A-J1", stage: "Grupo A", home: "3 - Os filhos do recluso", away: "5 - A Ganza está na Areia", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-A-J2", stage: "Grupo A", home: "19 - Sede Máxima", away: "25 - Sokago nomar", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-A-SF1", stage: "Grupo A", home: "13 - -1Guerreiro", away: "WIN:AN-A-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-A-SF2", stage: "Grupo A", home: "27 - Habemus Cunnus", away: "WIN:AN-A-J2", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-A-F", stage: "Grupo A", home: "WIN:AN-A-SF1", away: "WIN:AN-A-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
        B: {
          teams: ["4 - 100abrigos", "6 - Fistoum", "9 - Reabilitação cancelada", "12 - Mamas Industriais", "23 - Traficantes da reboleira", "26 - Repetida", "11 - Zé Longuinho"],
          matches: [
            { id: "AN-B-J1", stage: "Grupo B", home: "4 - 100abrigos", away: "6 - Fistoum", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-B-J2", stage: "Grupo B", home: "9 - Reabilitação cancelada", away: "12 - Mamas Industriais", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-B-J3", stage: "Grupo B", home: "23 - Traficantes da reboleira", away: "26 - Repetida", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-B-SF1", stage: "Grupo B", home: "11 - Zé Longuinho", away: "WIN:AN-B-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-B-SF2", stage: "Grupo B", home: "WIN:AN-B-J2", away: "WIN:AN-B-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-B-F", stage: "Grupo B", home: "WIN:AN-B-SF1", away: "WIN:AN-B-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
        C: {
          teams: ["8 - Boteco", "14 - Havaianas", "17 - SOS", "20 - Niguiris FC", "18 - Aboubacrew", "24 - all cool", "10 - O João é um fdp"],
          matches: [
            { id: "AN-C-J1", stage: "Grupo C", home: "8 - Boteco", away: "14 - Havaianas", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-C-J2", stage: "Grupo C", home: "17 - SOS", away: "20 - Niguiris FC", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-C-J3", stage: "Grupo C", home: "18 - Aboubacrew", away: "24 - all cool", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-C-SF1", stage: "Grupo C", home: "10 - O João é um fdp", away: "WIN:AN-C-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-C-SF2", stage: "Grupo C", home: "WIN:AN-C-J2", away: "WIN:AN-C-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-C-F", stage: "Grupo C", home: "WIN:AN-C-SF1", away: "WIN:AN-C-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
        D: {
          teams: ["1 - Atirei o pau à gata", "2 - DeGatas", "7 - Equipa do Tinoni", "15 - Trupe dos Lambões", "16 - Boyca and company", "22 - Tasqueiros da Moita", "21 - Manchester e um Nite"],
          matches: [
            { id: "AN-D-J1", stage: "Grupo D", home: "1 - Atirei o pau à gata", away: "2 - DeGatas", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-D-J2", stage: "Grupo D", home: "7 - Equipa do Tinoni", away: "15 - Trupe dos Lambões", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-D-J3", stage: "Grupo D", home: "16 - Boyca and company", away: "22 - Tasqueiros da Moita", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-D-SF1", stage: "Grupo D", home: "21 - Manchester e um Nite", away: "WIN:AN-D-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-D-SF2", stage: "Grupo D", home: "WIN:AN-D-J2", away: "WIN:AN-D-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "AN-D-F", stage: "Grupo D", home: "WIN:AN-D-SF1", away: "WIN:AN-D-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
    },
    Futebol: {
        A: {
          teams: ["2 - DeGatas", "9 - Reabilitação cancelada", "11 - Zé Longuinho", "18 - Aboubacrew", "21 - Manchester e um Nite", "26 - Repetida"],
          matches: [
            { id: "FT-A-J1", stage: "Grupo A", home: "11 - Zé Longuinho", away: "18 - Aboubacrew", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-A-J2", stage: "Grupo A", home: "21 - Manchester e um Nite", away: "26 - Repetida", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-A-SF1", stage: "Grupo A", home: "2 - DeGatas", away: "WIN:FT-A-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-A-SF2", stage: "Grupo A", home: "9 - Reabilitação cancelada", away: "WIN:FT-A-J2", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-A-F", stage: "Grupo A", home: "WIN:FT-A-SF1", away: "WIN:FT-A-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
        B: {
          teams: ["1 - Atirei o pau à gata", "12 - Mamas Industriais", "14 - Havaianas", "15 - Trupe dos Lambões", "17 - SOS", "27 - Habemus Cunnus", "16 - Boyca and company"],
          matches: [
            { id: "FT-B-J1", stage: "Grupo B", home: "1 - Atirei o pau à gata", away: "12 - Mamas Industriais", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-B-J2", stage: "Grupo B", home: "14 - Havaianas", away: "15 - Trupe dos Lambões", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-B-J3", stage: "Grupo B", home: "17 - SOS", away: "27 - Habemus Cunnus", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-B-SF1", stage: "Grupo B", home: "16 - Boyca and company", away: "WIN:FT-B-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-B-SF2", stage: "Grupo B", home: "WIN:FT-B-J2", away: "WIN:FT-B-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-B-F", stage: "Grupo B", home: "WIN:FT-B-SF1", away: "WIN:FT-B-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
        C: {
          teams: ["13 - -1Guerreiro", "20 - Niguiris FC", "22 - Tasqueiros da Moita", "24 - all cool", "23 - Traficantes da reboleira", "25 - Sokago nomar", "4 - 100abrigos"],
          matches: [
            { id: "FT-C-J1", stage: "Grupo C", home: "13 - -1Guerreiro", away: "20 - Niguiris FC", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-C-J2", stage: "Grupo C", home: "22 - Tasqueiros da Moita", away: "24 - all cool", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-C-J3", stage: "Grupo C", home: "23 - Traficantes da reboleira", away: "25 - Sokago nomar", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-C-SF1", stage: "Grupo C", home: "4 - 100abrigos", away: "WIN:FT-C-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-C-SF2", stage: "Grupo C", home: "WIN:FT-C-J2", away: "WIN:FT-C-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-C-F", stage: "Grupo C", home: "WIN:FT-C-SF1", away: "WIN:FT-C-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
        D: {
          teams: ["3 - Os filhos do recluso", "7 - Equipa do Tinoni", "5 - A Ganza está na Areia", "8 - Boteco", "10 - O João é um fdp", "19 - Sede Máxima", "6 - Fistoum"],
          matches: [
            { id: "FT-D-J1", stage: "Grupo D", home: "3 - Os filhos do recluso", away: "7 - Equipa do Tinoni", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-D-J2", stage: "Grupo D", home: "5 - A Ganza está na Areia", away: "8 - Boteco", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-D-J3", stage: "Grupo D", home: "10 - O João é um fdp", away: "19 - Sede Máxima", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-D-SF1", stage: "Grupo D", home: "6 - Fistoum", away: "WIN:FT-D-J1", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-D-SF2", stage: "Grupo D", home: "WIN:FT-D-J2", away: "WIN:FT-D-J3", homeScore: "", awayScore: "", tiebreakWinner: "" },
            { id: "FT-D-F", stage: "Grupo D", home: "WIN:FT-D-SF1", away: "WIN:FT-D-SF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
          ],
        },
    },
  },
  finals: {
    Voleibol: [
      { id: "VB-MF1", stage: "Meia-final", home: "WIN_GROUP:Voleibol:A", away: "WIN_GROUP:Voleibol:B", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "VB-MF2", stage: "Meia-final", home: "WIN_GROUP:Voleibol:C", away: "WIN_GROUP:Voleibol:D", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "VB-3RD", stage: "3.º/4.º lugar", home: "LOSS:VB-MF1", away: "LOSS:VB-MF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "VB-FINAL", stage: "Final", home: "WIN:VB-MF1", away: "WIN:VB-MF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
    ],
    Andebol: [
      { id: "AN-MF1", stage: "Meia-final", home: "WIN_GROUP:Andebol:A", away: "WIN_GROUP:Andebol:B", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "AN-MF2", stage: "Meia-final", home: "WIN_GROUP:Andebol:C", away: "WIN_GROUP:Andebol:D", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "AN-3RD", stage: "3.º/4.º lugar", home: "LOSS:AN-MF1", away: "LOSS:AN-MF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "AN-FINAL", stage: "Final", home: "WIN:AN-MF1", away: "WIN:AN-MF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
    ],
    Futebol: [
      { id: "FT-MF1", stage: "Meia-final", home: "WIN_GROUP:Futebol:A", away: "WIN_GROUP:Futebol:B", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "FT-MF2", stage: "Meia-final", home: "WIN_GROUP:Futebol:C", away: "WIN_GROUP:Futebol:D", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "FT-3RD", stage: "3.º/4.º lugar", home: "LOSS:FT-MF1", away: "LOSS:FT-MF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
      { id: "FT-FINAL", stage: "Final", home: "WIN:FT-MF1", away: "WIN:FT-MF2", homeScore: "", awayScore: "", tiebreakWinner: "" },
    ],
  },
};

// Funções Utilitárias
function modalityIcon(m) {
  if (m === "Voleibol") return <Volleyball className="h-5 w-5" />;
  if (m === "Andebol") return <Hand className="h-5 w-5" />;
  return <Goal className="h-5 w-5" />;
}

function hasScores(m) { return m.homeScore !== "" && m.awayScore !== ""; }
function winnerOf(m) {
  if (!hasScores(m)) return "";
  const h = Number(m.homeScore), a = Number(m.awayScore);
  return h > a ? m.home : a > h ? m.away : (m.tiebreakWinner || "");
}
function loserOf(m) {
  const w = winnerOf(m);
  return w ? (w === m.home ? m.away : m.home) : "";
}

function resolvedData(raw) {
  const data = JSON.parse(JSON.stringify(raw));
  const idx = {};
  Object.values(data.groups).forEach(gMod => Object.values(gMod).forEach(g => g.matches.forEach(m => idx[m.id] = m)));
  Object.values(data.finals).forEach(fMod => fMod.forEach(m => idx[m.id] = m));

  const resolve = (slot) => {
    if (!slot || typeof slot !== 'string') return slot;
    if (slot.startsWith("WIN:")) return winnerOf(idx[slot.split(":")[1]]) || "Por definir";
    if (slot.startsWith("LOSS:")) return loserOf(idx[slot.split(":")[1]]) || "Por definir";
    if (slot.startsWith("WIN_GROUP:")) {
      const [, mod, gKey] = slot.split(":");
      const fId = `${mod === "Voleibol" ? "VB" : mod === "Andebol" ? "AN" : "FT"}-${gKey}-F`;
      return winnerOf(idx[fId]) || `Vencedor Grupo ${gKey}`;
    }
    return slot;
  };

  Object.keys(data.groups).forEach(m => {
    Object.keys(data.groups[m]).forEach(g => data.groups[m][g].matches.forEach(match => {
      match.home = resolve(match.home); match.away = resolve(match.away);
    }));
    data.finals[m].forEach(match => {
      match.home = resolve(match.home); match.away = resolve(match.away);
    });
  });
  return data;
}

// Componentes UI Básicos (Substitutos do Shadcn)
const Card = ({ children, className }) => <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>{children}</div>;
const Button = ({ children, onClick, variant = "primary", className, disabled }) => {
  const base = "px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50";
  const styles = variant === "primary" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200";
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>{children}</button>;
};

export default function Page() {
  const [rawData, setRawData] = useState(initialTournament);
  const [adminSession, setAdminSession] = useState(null);
  const [modality, setModality] = useState("Voleibol");
  const [group, setGroup] = useState("A");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("public");

  // Lógica de Sincronização Supabase
  useEffect(() => {
    if (!supabase) return;
    const fetchState = async () => {
      const { data } = await supabase.from("app_state").select("payload").eq("id", STATE_ROW_ID).single();
      if (data?.payload) setRawData(data.payload);
    };
    fetchState();
    const channel = supabase.channel("live").on("postgres_changes", { event: "*", schema: "public", table: "app_state" }, fetchState).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const data = useMemo(() => resolvedData(rawData), [rawData]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-900">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <div className="bg-indigo-700 rounded-3xl p-6 text-white shadow-xl">
          <h1 className="text-2xl font-bold">Gata na Praia '26</h1>
          <p className="text-indigo-100 text-sm opacity-80">Resultados em tempo real</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-2xl">
          <button onClick={() => setTab("public")} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "public" ? "bg-white shadow" : ""}`}>Público</button>
          <button onClick={() => setTab("admin")} className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "admin" ? "bg-white shadow" : ""}`}>Admin</button>
        </div>

        {/* Conteúdo */}
        {tab === "public" ? (
          <div className="space-y-4">
             <div className="flex gap-2">
                <select value={modality} onChange={(e) => setModality(e.target.value)} className="flex-1 p-3 rounded-xl border-slate-200 text-sm bg-white border outline-none">
                  {rawData.modalities.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={group} onChange={(e) => setGroup(e.target.value)} className="w-24 p-3 rounded-xl border-slate-200 text-sm bg-white border outline-none">
                  {["A", "B", "C", "D"].map(g => <option key={g} value={g}>Gr. {g}</option>)}
                </select>
             </div>

             <Card className="p-4 space-y-4">
                <h2 className="font-bold flex items-center gap-2">{modalityIcon(modality)} {modality} - Grupo {group}</h2>
                <div className="space-y-3">
                  {data.groups[modality][group].matches.map(m => (
                    <div key={m.id} className="border-b pb-3 last:border-0">
                      <div className="text-[10px] uppercase text-slate-400 mb-1">{m.stage}</div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{m.home}</span>
                        <span className="font-bold">{m.homeScore || "-"}</span>
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm">{m.away}</span>
                        <span className="font-bold">{m.awayScore || "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
             </Card>

             <Card className="p-4 bg-amber-50 border-amber-100">
                <h2 className="font-bold flex items-center gap-2 text-amber-900"><Trophy className="h-5 w-5" /> Fase Final</h2>
                <div className="mt-3 space-y-3">
                  {data.finals[modality].map(m => (
                    <div key={m.id} className="text-sm flex justify-between">
                      <span className="text-slate-600">{m.stage}:</span>
                      <span className="font-medium">{winnerOf(m) || "A definir"}</span>
                    </div>
                  ))}
                </div>
             </Card>
          </div>
        ) : (
          <Card className="p-8 text-center">
             <Lock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
             <p className="text-slate-600 text-sm">Para editar resultados, configura o login no Auth do Supabase.</p>
             <Button className="mt-4 w-full" variant="secondary">Ir para painel Supabase</Button>
          </Card>
        )}
      </div>
    </div>
  );
}