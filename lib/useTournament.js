"use client";
import { useCallback, useEffect, useState } from "react";
import { loadAppState, subscribeToAppState, supabase } from "@/lib/appState";
import config from "@/tournament.config.json";

/**
 * Competição publicada, atualizada em tempo real e ao voltar à página.
 * live = true enquanto a ligação em tempo real está ativa.
 */
export function useTournament(id) {
  const [published, setPublished] = useState(null);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const { state } = await loadAppState(id);
      setPublished(state);
      setLoadError(null);
    } catch (error) {
      setLoadError(error.message);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeToAppState(id, ({ state }) => setPublished(state), setLive);
    // Telemóveis cortam a ligação em segundo plano: ao voltar à página, vai buscar o mais recente.
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [id, fetchData]);

  return { published, setPublished, live, loadError, fetchData };
}

/** Utilizador com sessão iniciada (admin), ou null. */
export function useAdminUser() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);
  return user;
}

const myTeamKey = (competition) => `gata:minha-equipa:${competition}`;
// Antes de haver várias competições, a equipa seguida guardava-se sem competição.
const LEGACY_KEY = "gata:minha-equipa";

// localStorage pode falhar (navegação privada, armazenamento bloqueado): nesse caso
// a app funciona na mesma, só não se lembra da equipa.
export function getMyTeam(competition) {
  try {
    const saved = window.localStorage.getItem(myTeamKey(competition));
    return saved ?? (competition === config.id ? window.localStorage.getItem(LEGACY_KEY) : null);
  } catch {
    return null;
  }
}

export function setMyTeam(competition, slug) {
  try {
    if (slug) window.localStorage.setItem(myTeamKey(competition), slug);
    else window.localStorage.removeItem(myTeamKey(competition));
  } catch {
    // ignorado: ver acima
  }
}
