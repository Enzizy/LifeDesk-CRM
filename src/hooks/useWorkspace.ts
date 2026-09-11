import { useCallback, useEffect, useState } from "react";
import * as db from "../lib/records";
import type { Candidate, Prospect, Settings, Task } from "../types";

export type WorkspaceState = {
  prospects: Prospect[];
  tasks: Task[];
  candidates: Candidate[];
  settings: Settings;
  loading: boolean;
  error: string;
};

const emptySettings: Settings = {
  defaultLocation: "",
  serviceOffers: [],
  discoveryLimit: 5,
  currencyCode: "PHP",
};

/**
 * Owns every server-backed collection. Mutations run against the database and
 * then refresh the affected list, rather than patching local state optimistically:
 * with a single user and small collections the extra round trip is cheap, and it
 * removes any chance of the screen disagreeing with what was actually stored.
 */
export type Workspace = WorkspaceState & {
  refresh: () => Promise<void>;
  refreshProspects: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshCandidates: () => Promise<void>;
  setSettings: (settings: Settings) => void;
};

export function useWorkspace(enabled: boolean): Workspace {
  const [state, setState] = useState<WorkspaceState>({
    prospects: [],
    tasks: [],
    candidates: [],
    settings: emptySettings,
    loading: enabled,
    error: "",
  });

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setState((current) => ({ ...current, loading: true }));
    try {
      const [prospects, tasks, candidates, settings] = await Promise.all([
        db.listProspects(),
        db.listTasks(),
        db.listPendingCandidates(),
        db.getSettings(),
      ]);
      setState({ prospects, tasks, candidates, settings, loading: false, error: "" });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Your workspace could not be loaded.",
      }));
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setState({
        prospects: [],
        tasks: [],
        candidates: [],
        settings: emptySettings,
        loading: false,
        error: "",
      });
      return;
    }
    void refresh();
  }, [enabled, refresh]);

  const refreshProspects = useCallback(async () => {
    const prospects = await db.listProspects();
    setState((current) => ({ ...current, prospects }));
  }, []);

  const refreshTasks = useCallback(async () => {
    const tasks = await db.listTasks();
    setState((current) => ({ ...current, tasks }));
  }, []);

  const refreshCandidates = useCallback(async () => {
    const candidates = await db.listPendingCandidates();
    setState((current) => ({ ...current, candidates }));
  }, []);

  const setSettings = useCallback((settings: Settings) => {
    setState((current) => ({ ...current, settings }));
  }, []);

  return {
    ...state,
    refresh,
    refreshProspects,
    refreshTasks,
    refreshCandidates,
    setSettings,
  };
}
