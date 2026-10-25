import React, { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Trophy, ShieldCheck, Volleyball, Goal, Hand, Medal, Wifi, WifiOff, Lock, LogOut, RefreshCw } from "lucide-react";

/**
 * Gata na Praia '26 — mobile app pronta para publicação
 *
 * Como publicar em produção:
 * 1) Criar projeto Supabase
 * 2) Adicionar variáveis de ambiente:
 *    - NEXT_PUBLIC_SUPABASE_URL
 *    - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 3) Criar tabela `app_state` com colunas:
 *    - id text primary key
 *    - payload jsonb not null
 *    - updated_at timestamptz default now()
 * 4) Criar utilizadores admin no Auth do Supabase
 *
 * Sem Supabase configurado, a app funciona em modo demo com localStorage.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const STORAGE_KEY = "gata-na-praia-2026-mobile";
const STATE_ROW_ID = "gata-na-praia-2026-official";

const EVENT_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAADdCAYAAABDlBYyAAEAAElEQVR4nOydd5wdVfn/32dmbt+7vW96D0lIAoHQexcQKSKi2FEsqIgKYkVQv4qIYEERQQTpL4gF1C8oFhAUf1GQJYJYRCwSUKQlhZAQ0j2kfZJ3d7M7vz/mzJw7mZ3Z2dl9kveT3+fJkzv3nHPOOefcc88955xzjquqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6v8H5q8d9yI9qWAAAAAElFTkSuQmCC";

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

function modalityIcon(modality) {
  if (modality === "Voleibol") return <Volleyball className="h-4 w-4" />;
  if (modality === "Andebol") return <Hand className="h-4 w-4" />;
  return <Goal className="h-4 w-4" />;
}

function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

function hasScores(match) {
  return match.homeScore !== "" && match.awayScore !== "";
}

function winnerOf(match) {
  if (!match || !hasScores(match)) return "";
  const h = Number(match.homeScore);
  const a = Number(match.awayScore);
  if (h > a) return match.home;
  if (a > h) return match.away;
  return match.tiebreakWinner || "";
}

function loserOf(match) {
  const winner = winnerOf(match);
  if (!winner || !match) return "";
  return winner === match.home ? match.away : match.home;
}

function buildIndex(data) {
  const map = {};
  Object.values(data.groups).forEach((modalityGroups) => {
    Object.values(modalityGroups).forEach((group) => {
      group.matches.forEach((m) => {
        map[m.id] = m;
      });
    });
  });
  Object.values(data.finals).forEach((matches) => {
    matches.forEach((m) => {
      map[m.id] = m;
    });
  });
  return map;
}

function groupWinner(data, modality, groupKey) {
  const finalId = `${modality === "Voleibol" ? "VB" : modality === "Andebol" ? "AN" : "FT"}-${groupKey}-F`;
  const idx = buildIndex(data);
  return winnerOf(idx[finalId]);
}

function resolveSlot(slot, data) {
  const idx = buildIndex(data);
  if (!slot?.startsWith || (!slot.startsWith("WIN:") && !slot.startsWith("LOSS:") && !slot.startsWith("WIN_GROUP:"))) return slot;
  if (slot.startsWith("WIN:")) return winnerOf(idx[slot.replace("WIN:", "")]) || "Por definir";
  if (slot.startsWith("LOSS:")) return loserOf(idx[slot.replace("LOSS:", "")]) || "Por definir";
  if (slot.startsWith("WIN_GROUP:")) {
    const [, modality, groupKey] = slot.split(":");
    return groupWinner(data, modality, groupKey) || `${modality} — Grupo ${groupKey}`;
  }
  return slot;
}

function resolvedData(raw) {
  const data = clone(raw);
  Object.keys(data.groups).forEach((modality) => {
    Object.keys(data.groups[modality]).forEach((groupKey) => {
      data.groups[modality][groupKey].matches = data.groups[modality][groupKey].matches.map((m) => ({
        ...m,
        home: resolveSlot(m.home, data),
        away: resolveSlot(m.away, data),
      }));
    });
    data.finals[modality] = data.finals[modality].map((m) => ({
      ...m,
      home: resolveSlot(m.home, data),
      away: resolveSlot(m.away, data),
    }));
  });
  return data;
}

async function loadRemoteState() {
  if (!supabase) return null;
  const { data, error } = await supabase.from("app_state").select("payload").eq("id", STATE_ROW_ID).single();
  if (error || !data?.payload) return null;
  return data.payload;
}

async function saveRemoteState(payload) {
  if (!supabase) return { ok: false };
  const { error } = await supabase.from("app_state").upsert({ id: STATE_ROW_ID, payload, updated_at: new Date().toISOString() });
  return { ok: !error, error };
}

function MatchCard({ match, admin, onFieldChange, onCommit }) {
  const winner = winnerOf(match);

  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{match.stage}</Badge>
          <div className="text-xs text-slate-500">{match.id}</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="text-sm font-medium leading-tight">{match.home}</div>
            <div className="text-lg font-bold">{match.homeScore === "" ? "-" : match.homeScore}</div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="text-sm font-medium leading-tight">{match.away}</div>
            <div className="text-lg font-bold">{match.awayScore === "" ? "-" : match.awayScore}</div>
          </div>
        </div>

        {winner && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">Vencedor: {winner}</div>}

        {admin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full rounded-xl">Inserir resultado</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle>Atualizar jogo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>{match.home}</Label>
                  <Input type="number" value={match.homeScore} onChange={(e) => onFieldChange(match.id, "homeScore", e.target.value)} />
                </div>
                <div>
                  <Label>{match.away}</Label>
                  <Input type="number" value={match.awayScore} onChange={(e) => onFieldChange(match.id, "awayScore", e.target.value)} />
                </div>
                <div>
                  <Label>Desempate manual</Label>
                  <Select value={match.tiebreakWinner || "none"} onValueChange={(v) => onFieldChange(match.id, "tiebreakWinner", v === "none" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem desempate</SelectItem>
                      <SelectItem value={match.home}>{match.home}</SelectItem>
                      <SelectItem value={match.away}>{match.away}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full rounded-xl" onClick={onCommit}>Guardar resultado</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}

function FinalStandings({ modality, data }) {
  const finalMatches = data.finals[modality];
  const champion = winnerOf(finalMatches.find((m) => m.stage === "Final"));
  const runnerUp = loserOf(finalMatches.find((m) => m.stage === "Final"));
  const third = winnerOf(finalMatches.find((m) => m.stage === "3.º/4.º lugar"));
  const fourth = loserOf(finalMatches.find((m) => m.stage === "3.º/4.º lugar"));

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-xs text-amber-700 mb-1">1.º lugar</div>
        <div className="font-semibold">{champion || "Por definir"}</div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-xs text-slate-500 mb-1">2.º lugar</div>
        <div className="font-semibold">{runnerUp || "Por definir"}</div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-xs text-slate-500 mb-1">3.º lugar</div>
        <div className="font-semibold">{third || "Por definir"}</div>
      </div>
      <div className="rounded-2xl border p-4">
        <div className="text-xs text-slate-500 mb-1">4.º lugar</div>
        <div className="font-semibold">{fourth || "Por definir"}</div>
      </div>
    </div>
  );
}

function PublicBracket({ modality, data }) {
  return (
    <Card className="rounded-2xl border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><Trophy className="h-5 w-5" /> Fase Final — {modality}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.finals[modality].map((m) => (
          <div key={m.id} className="rounded-2xl border p-4">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">{m.stage}</div>
            <div className="font-medium">{m.home}</div>
            <div className="text-slate-400 text-sm my-1">vs</div>
            <div className="font-medium">{m.away}</div>
            {winnerOf(m) && <div className="mt-2 text-sm font-medium text-emerald-700">Vencedor: {winnerOf(m)}</div>}
          </div>
        ))}
        <FinalStandings modality={modality} data={data} />
      </CardContent>
    </Card>
  );
}

export default function App() {
  const [rawData, setRawData] = useState(initialTournament);
  const [adminSession, setAdminSession] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [modality, setModality] = useState("Voleibol");
  const [group, setGroup] = useState("A");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("A carregar dados...");
  const [onlineMode, setOnlineMode] = useState(Boolean(supabase));

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      setLoading(true);

      const local = localStorage.getItem(STORAGE_KEY);
      if (local && mounted) {
        try {
          setRawData(JSON.parse(local));
        } catch {}
      }

      if (supabase) {
        const { data: auth } = await supabase.auth.getSession();
        if (mounted) setAdminSession(auth?.session || null);

        const remote = await loadRemoteState();
        if (remote && mounted) {
          setRawData(remote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          setStatus("Ligado à base de dados online.");
        } else if (mounted) {
          setStatus("Modo online disponível. A usar dados locais até existir estado remoto.");
        }

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
          setAdminSession(session || null);
        });

        const channel = supabase
          .channel("gata-na-praia-live")
          .on("postgres_changes", { event: "*", schema: "public", table: "app_state", filter: `id=eq.${STATE_ROW_ID}` }, async () => {
            const remoteState = await loadRemoteState();
            if (remoteState) {
              setRawData(remoteState);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteState));
            }
          })
          .subscribe();

        if (mounted) {
          setLoading(false);
        }

        return () => {
          listener.subscription.unsubscribe();
          supabase.removeChannel(channel);
        };
      }

      if (mounted) {
        setStatus("Modo demo local. Configura Supabase para publicação online.");
        setLoading(false);
      }
    }

    const cleanupPromise = bootstrap();
    return () => {
      mounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === "function") cleanup();
      });
    };
  }, []);

  const data = useMemo(() => resolvedData(rawData), [rawData]);

  const persistLocal = (next) => {
    setRawData(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const updateField = (matchId, field, value) => {
    const next = clone(rawData);
    Object.keys(next.groups).forEach((m) => {
      Object.keys(next.groups[m]).forEach((g) => {
        next.groups[m][g].matches = next.groups[m][g].matches.map((match) => match.id === matchId ? { ...match, [field]: value } : match);
      });
      next.finals[m] = next.finals[m].map((match) => match.id === matchId ? { ...match, [field]: value } : match);
    });
    persistLocal(next);
  };

  const commitResults = async () => {
    if (!supabase || !adminSession) {
      setStatus("Resultado guardado localmente.");
      return;
    }
    setSaving(true);
    const result = await saveRemoteState(rawData);
    setSaving(false);
    setStatus(result.ok ? "Resultado publicado online." : "Falha ao publicar online.");
  };

  const loginAdmin = async () => {
    if (!supabase) {
      setStatus("Sem Supabase configurado. A área admin está em modo demo local.");
      setAdminSession({ user: { email: "demo@local" } });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setStatus(error ? "Falha no login." : "Admin autenticado com sucesso.");
  };

  const logoutAdmin = async () => {
    if (supabase) await supabase.auth.signOut();
    setAdminSession(null);
    setStatus("Sessão terminada.");
  };

  const refreshRemote = async () => {
    if (!supabase) {
      setStatus("Sem modo online configurado.");
      return;
    }
    setLoading(true);
    const remote = await loadRemoteState();
    if (remote) {
      setRawData(remote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      setStatus("Dados atualizados a partir da base de dados.");
    } else {
      setStatus("Não foi encontrado estado remoto.");
    }
    setLoading(false);
  };

  const totals = useMemo(() => {
    let total = 0;
    let completed = 0;
    Object.keys(data.groups).forEach((m) => {
      Object.values(data.groups[m]).forEach((g) => g.matches.forEach((match) => {
        total += 1;
        if (hasScores(match)) completed += 1;
      }));
      data.finals[m].forEach((match) => {
        total += 1;
        if (hasScores(match)) completed += 1;
      });
    });
    return { total, completed };
  }, [data]);

  const activeGroup = data.groups[modality][group];
  const isAdmin = Boolean(adminSession);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-md px-4 py-5 space-y-4">
        <Card className="overflow-hidden rounded-3xl border-0 bg-gradient-to-br from-sky-700 via-indigo-700 to-violet-800 text-white shadow-xl">
          <CardContent className="p-5 space-y-4">
            <img src={EVENT_LOGO} alt="Gata na Praia 2026" className="w-full rounded-2xl bg-white/10 p-2" />
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-sky-100">Gata na Praia '26</div>
                <div className="text-2xl font-bold">Resultados e quadros</div>
              </div>
              <div className="rounded-2xl bg-white/15 p-3"><Medal className="h-6 w-6" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-xs text-sky-100">Jogos concluídos</div>
                <div className="text-2xl font-bold">{totals.completed}</div>
              </div>
              <div className="rounded-2xl bg-white/10 p-3">
                <div className="text-xs text-sky-100">Jogos totais</div>
                <div className="text-2xl font-bold">{totals.total}</div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/10 px-3 py-2 text-sm">
              <div className="flex items-center gap-2">
                {onlineMode ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                <span>{onlineMode ? "Modo online preparado" : "Modo demo local"}</span>
              </div>
              <Button variant="secondary" size="sm" className="rounded-xl" onClick={refreshRemote}>
                <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-4 text-sm text-slate-600">
            {loading ? "A carregar..." : status}
          </CardContent>
        </Card>

        <Tabs defaultValue="public" className="w-full">
          <TabsList className="grid h-12 grid-cols-2 rounded-2xl">
            <TabsTrigger value="public" className="rounded-2xl">Participantes</TabsTrigger>
            <TabsTrigger value="admin" className="rounded-2xl">Admin</TabsTrigger>
          </TabsList>

          <TabsContent value="public" className="mt-4 space-y-4">
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="grid grid-cols-2 gap-3 p-4">
                <div>
                  <Label>Modalidade</Label>
                  <Select value={modality} onValueChange={setModality}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {initialTournament.modalities.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Grupo</Label>
                  <Select value={group} onValueChange={setGroup}>
                    <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D"].map((g) => <SelectItem key={g} value={g}>Grupo {g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">{modalityIcon(modality)} {modality} — Grupo {group}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {activeGroup.teams.map((team) => <Badge key={team} variant="outline" className="rounded-full px-3 py-1">{team}</Badge>)}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              {activeGroup.matches.map((match) => (
                <MatchCard key={match.id} match={match} admin={false} onFieldChange={() => {}} onCommit={() => {}} />
              ))}
            </div>

            <PublicBracket modality={modality} data={data} />
          </TabsContent>

          <TabsContent value="admin" className="mt-4 space-y-4">
            {!isAdmin ? (
              <Card className="rounded-2xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg"><Lock className="h-5 w-5" /> Área reservada</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@gatanapraia.pt" className="mt-1 rounded-xl" />
                  </div>
                  <div>
                    <Label>Password</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Introduzir password" className="mt-1 rounded-xl" />
                  </div>
                  <Button className="w-full rounded-xl" onClick={loginAdmin}>Entrar</Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="rounded-2xl border-emerald-200 bg-emerald-50 shadow-sm">
                  <CardContent className="flex items-center justify-between gap-3 p-4">
                    <div>
                      <div className="font-semibold text-emerald-800">Modo administrador ativo</div>
                      <div className="text-sm text-emerald-700">Sessão: {adminSession?.user?.email || "demo@local"}</div>
                    </div>
                    <Button variant="outline" className="rounded-xl" onClick={logoutAdmin}>
                      <LogOut className="mr-1 h-4 w-4" /> Sair
                    </Button>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-sm">
                  <CardContent className="grid grid-cols-2 gap-3 p-4">
                    <div>
                      <Label>Modalidade</Label>
                      <Select value={modality} onValueChange={setModality}>
                        <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {initialTournament.modalities.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grupo</Label>
                      <Select value={group} onValueChange={setGroup}>
                        <SelectTrigger className="mt-1 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["A", "B", "C", "D"].map((g) => <SelectItem key={g} value={g}>Grupo {g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-3">
                  {activeGroup.matches.map((match) => (
                    <MatchCard key={match.id} match={match} admin={true} onFieldChange={updateField} onCommit={commitResults} />
                  ))}
                </div>

                <Card className="rounded-2xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg">Fase Final — {modality}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.finals[modality].map((match) => (
                      <MatchCard key={match.id} match={match} admin={true} onFieldChange={updateField} onCommit={commitResults} />
                    ))}
                    <Button className="w-full rounded-xl" disabled={saving} onClick={commitResults}>
                      {saving ? "A publicar..." : "Publicar todas as alterações"}
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
