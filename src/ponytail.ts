import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const MODES = new Set(["lite", "full", "ultra", "off"]);

// shortcut: Ponytail 5.3.3 keeps its mode in a private file and has no API.
// Revisit if Ponytail adds one.
function configHome(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}

function statePath(): string {
  return path.join(configHome(), "opencode", ".ponytail-active");
}

function savedMode(): string | undefined {
  try {
    const mode = fs.readFileSync(statePath(), "utf8").trim().toLowerCase();
    return MODES.has(mode) ? mode : undefined;
  } catch {
    return undefined;
  }
}

// Mirror Ponytail's resolution: environment, then its config file, then full.
function defaultMode(): string {
  const fromEnv = process.env.PONYTAIL_DEFAULT_MODE?.trim().toLowerCase();
  if (fromEnv && MODES.has(fromEnv)) return fromEnv;

  try {
    const config = JSON.parse(
      fs.readFileSync(path.join(configHome(), "ponytail", "config.json"), "utf8"),
    ) as {
      defaultMode?: unknown;
    };
    const fromConfig = typeof config?.defaultMode === "string" ? config.defaultMode.trim().toLowerCase() : "";
    if (MODES.has(fromConfig)) return fromConfig;
  } catch {
    // A missing or unreadable config means the built-in default.
  }

  return "full";
}

export function isPonytailActive(): boolean {
  return (savedMode() ?? defaultMode()) !== "off";
}
