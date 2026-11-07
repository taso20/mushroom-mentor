import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isPonytailActive } from "../src/ponytail.ts";

let configHome: string;
let originalXdg: string | undefined;
let originalDefault: string | undefined;

beforeEach(() => {
  originalXdg = process.env.XDG_CONFIG_HOME;
  originalDefault = process.env.PONYTAIL_DEFAULT_MODE;
  delete process.env.PONYTAIL_DEFAULT_MODE;
  configHome = fs.mkdtempSync(path.join(os.tmpdir(), "mushroom-test-"));
  process.env.XDG_CONFIG_HOME = configHome;
});

afterEach(() => {
  restore("XDG_CONFIG_HOME", originalXdg);
  restore("PONYTAIL_DEFAULT_MODE", originalDefault);
  fs.rmSync(configHome, { recursive: true, force: true });
});

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function writeMode(mode: string) {
  fs.mkdirSync(path.join(configHome, "opencode"), { recursive: true });
  fs.writeFileSync(path.join(configHome, "opencode", ".ponytail-active"), mode);
}

function writeConfig(defaultMode: string) {
  fs.mkdirSync(path.join(configHome, "ponytail"), { recursive: true });
  fs.writeFileSync(path.join(configHome, "ponytail", "config.json"), JSON.stringify({ defaultMode }));
}

describe("Ponytail detection", () => {
  test("treats a missing state file as the default full mode", () => {
    expect(isPonytailActive()).toBe(true);
  });

  test("reports a mode as active", () => {
    writeMode("full");
    expect(isPonytailActive()).toBe(true);
  });

  test("reports off as inactive", () => {
    writeMode("off");
    expect(isPonytailActive()).toBe(false);
  });

  test("ignores an invalid mode and uses the default", () => {
    writeMode("banana");
    expect(isPonytailActive()).toBe(true);
  });

  test("uses the default off from the environment", () => {
    process.env.PONYTAIL_DEFAULT_MODE = "off";
    expect(isPonytailActive()).toBe(false);
  });

  test("uses the default mode from the config file", () => {
    writeConfig("off");
    expect(isPonytailActive()).toBe(false);
  });

  test("prefers a saved mode over the default", () => {
    writeMode("off");
    process.env.PONYTAIL_DEFAULT_MODE = "full";
    expect(isPonytailActive()).toBe(false);
  });
});
