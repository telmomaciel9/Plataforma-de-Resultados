"use client";
import { useCallback, useEffect, useState } from "react";
import { loadAppState, subscribeToAppState } from "@/lib/appState";

/**
 * Torneio publicado, atualizado em tempo real e ao voltar à página.
 * live = true enquanto a ligação em tempo real está ativa.
 */
export function useTournament() {
  const [published, setPublished] = useState(null);
  const [live, setLive] = useState(false);
  const [loadError, setLoadError] = useState(null);

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
    const unsubscribe = subscribeToAppState(({ state }) => setPublished(state), setLive);
    // Telemóveis cortam a ligação em segundo plano: ao voltar à página, vai buscar o mais recente.
    const onVisible = () => { if (document.visibilityState === "visible") fetchData(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  return { published, setPublished, live, loadError, fetchData };
}

const MY_TEAM_KEY = "gata:minha-equipa";

// localStorage pode falhar (navegação privada, armazenamento bloqueado): nesse caso
// a app funciona na mesma, só não se lembra da equipa.
export function getMyTeam() {
  try {
    return window.localStorage.getItem(MY_TEAM_KEY);
  } catch {
    return null;
  }
}

export function setMyTeam(slug) {
  try {
    if (slug) window.localStorage.setItem(MY_TEAM_KEY, slug);
    else window.localStorage.removeItem(MY_TEAM_KEY);
  } catch {
    // ignorado: ver acima
  }
}
