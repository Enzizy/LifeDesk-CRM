// Read-only access to workspaces saved by the pre-Supabase build.
//
// LifeDesk now stores everything in Postgres. This module exists only so the
// settings dialog can offer a one-time import of a browser-storage workspace;
// nothing writes here any more.

export const STORAGE_KEY = "lifedesk.workspace.v2";
const LEGACY_STORAGE_KEY = "lifedesk.workspace.v1";

export type PersistedWorkspace = {
  version: 2;
  prospects: unknown[];
  tasks: unknown[];
  queue: unknown[];
};

export type StorageLoad =
  | { status: "missing"; value: null }
  | { status: "valid"; value: PersistedWorkspace }
  | { status: "corrupt"; value: null; reason: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function loadWorkspace(
  storage: Storage | null | undefined,
): StorageLoad {
  if (!storage)
    return {
      status: "corrupt",
      value: null,
      reason: "Storage is unavailable.",
    };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
    if (raw === null) raw = storage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return {
      status: "corrupt",
      value: null,
      reason: "Browser storage could not be read.",
    };
  }
  if (raw === null) return { status: "missing", value: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || (parsed.version !== 1 && parsed.version !== 2))
      throw new Error("unsupported version");
    if (
      !Array.isArray(parsed.prospects) ||
      !Array.isArray(parsed.tasks) ||
      !Array.isArray(parsed.queue)
    ) {
      throw new Error("invalid collections");
    }
    const withoutSamples = (records: unknown[]) =>
      records.filter(
        (record) => !isRecord(record) || record.origin !== "sample",
      );
    return {
      status: "valid",
      value: {
        version: 2,
        prospects: withoutSamples(parsed.prospects),
        tasks: withoutSamples(parsed.tasks),
        queue: withoutSamples(parsed.queue),
      },
    };
  } catch {
    return {
      status: "corrupt",
      value: null,
      reason: "Saved workspace data is invalid.",
    };
  }
}


