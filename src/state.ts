import type { Plugin } from "@opencode/plugin";

const KEY_PREFIX = "mushroom/v1/session/";

export type SessionState = "on" | "off" | "new" | "unknown";

type Stored = { schema: 1; enabled: boolean };

export function stateKey(sessionID: string): string {
  return KEY_PREFIX + sessionID;
}

export async function readState(ctx: Plugin.Context, sessionID: string): Promise<SessionState> {
  const value = await ctx.storage.get(stateKey(sessionID));
  if (value === undefined) return "new";
  if (typeof value !== "object" || value === null || Array.isArray(value)) return "unknown";

  const stored = value as Partial<Stored>;
  if (stored.schema !== 1 || typeof stored.enabled !== "boolean") return "unknown";
  return stored.enabled ? "on" : "off";
}

export async function writeState(ctx: Plugin.Context, sessionID: string, enabled: boolean): Promise<void> {
  await ctx.storage.set(stateKey(sessionID), { schema: 1, enabled });
}

// "new" counts as ON so a fresh session gets the rules without a write.
export function isEnabled(state: SessionState): boolean {
  return state === "on" || state === "new";
}

const tails = new Map<string, Promise<unknown>>();

// Toggles for one session run one at a time so a slow write cannot be overtaken.
export function runSerial<T>(sessionID: string, task: () => Promise<T>): Promise<T> {
  const previous = tails.get(sessionID) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(task);
  const tail = run.catch(() => undefined);
  tails.set(sessionID, tail);
  void tail.finally(() => {
    if (tails.get(sessionID) === tail) tails.delete(sessionID);
  });
  return run;
}
