import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Plugin } from "@opencode/plugin";
import plugin from "../src/index.ts";
import { stateKey } from "../src/state.ts";

type Prompt = { sessionID: string; text: string; delivery: "steer" | "queue" };
type Command = {
  name: string;
  execute: (input: { sessionID: string; prompt: { text: string }; delivery: "steer" }) => Promise<void>;
};
type Hook = {
  name: string;
  run: (event: { sessionID: string; system: { type: "text"; text: string }[] }) => Promise<void>;
};

function makeContext(store = new Map<string, unknown>(), ponytailLoaded = false, failReads = false) {
  const skills: { autoinvoke?: boolean; content: string; path: string }[] = [];
  const hooks: Hook[] = [];
  const commands = new Map<string, Command>();
  const prompts: Prompt[] = [];
  const removed: string[] = [];

  const ctx = {
    plugin: {
      list: async () => ({
        location: { directory: "/tmp" },
        data: ponytailLoaded ? [{ id: "ponytail" }] : [],
      }),
    },
    skill: {
      transform: async (callback: (editor: { add: (skill: (typeof skills)[number]) => void }) => void) => {
        callback({ add: (skill) => skills.push(skill) });
      },
    },
    session: {
      hook: async (
        name: string,
        run: (event: { sessionID: string; system: { type: "text"; text: string }[] }) => Promise<void>,
      ) => {
        hooks.push({ name, run });
        return { dispose: async () => {} };
      },
      prompt: async (prompt: Prompt) => {
        prompts.push(prompt);
      },
    },
    command: {
      transform: async (callback: (editor: { add: (command: Command) => void }) => void) => {
        callback({ add: (command) => commands.set(command.name, command) });
      },
    },
    storage: {
      get: async (key: string) => {
        if (failReads) throw new Error("storage down");
        return store.get(key);
      },
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      remove: async (key: string) => {
        removed.push(key);
        store.delete(key);
      },
      scan: async () => ({ entries: [] }),
    },
    event: {
      subscribe: async function* () {
        yield { data: { sessionID: "gone" } };
      },
    },
  };

  return { ctx: ctx as unknown as Plugin.Context, skills, hooks, commands, prompts, removed, store };
}

async function start(store = new Map<string, unknown>(), ponytailLoaded = false, failReads = false) {
  const fake = makeContext(store, ponytailLoaded, failReads);
  const cleanup = await plugin.setup(fake.ctx);
  return { ...fake, cleanup };
}

describe("plugin setup", () => {
  test("registers the hidden rules skill, both hooks, and three commands", async () => {
    const { skills, hooks, commands, cleanup } = await start();

    expect(skills).toHaveLength(1);
    expect(skills[0]?.autoinvoke).toBe(false);
    expect(skills[0]?.content.length).toBeGreaterThan(0);
    expect(skills[0]?.path.endsWith("rules/SKILL.md")).toBe(true);
    expect(hooks.map((hook) => hook.name)).toEqual(["context", "compaction"]);
    expect([...commands.keys()]).toEqual(["mushroom", "mushroom-help", "mushroom-review"]);
    expect(typeof cleanup).toBe("function");
  });

  test("removes the stored state when a session is deleted", async () => {
    const { removed } = await start();

    for (let i = 0; i < 20 && removed.length === 0; i += 1) {
      await Bun.sleep(1);
    }
    expect(removed).toEqual([stateKey("gone")]);
  });
});

describe("Ponytail warning", () => {
  test("setup does not change Ponytail's state", async () => {
    const original = process.env.XDG_CONFIG_HOME;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mushroom-handoff-"));
    process.env.XDG_CONFIG_HOME = dir;
    try {
      fs.mkdirSync(path.join(dir, "opencode"));
      const file = path.join(dir, "opencode", ".ponytail-active");
      fs.writeFileSync(file, "full");

      await start(new Map(), true);

      expect(fs.readFileSync(file, "utf8")).toBe("full");
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("refuses to turn on while Ponytail is active, then allows it after off", async () => {
    const original = process.env.XDG_CONFIG_HOME;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mushroom-handoff-"));
    process.env.XDG_CONFIG_HOME = dir;
    try {
      fs.mkdirSync(path.join(dir, "opencode"));
      const file = path.join(dir, "opencode", ".ponytail-active");
      fs.writeFileSync(file, "full");

      const { commands, prompts, store } = await start(new Map(), true);
      await commands.get("mushroom")?.execute({ sessionID: "s1", prompt: { text: "on" }, delivery: "steer" });

      expect(store.get(stateKey("s1"))).toBeUndefined();
      expect(prompts.at(-1)?.text).toContain("Mushroom: OFF");
      expect(prompts.at(-1)?.text).toContain("/ponytail off");
      expect(fs.readFileSync(file, "utf8")).toBe("full");

      fs.writeFileSync(file, "off");
      await commands.get("mushroom")?.execute({ sessionID: "s1", prompt: { text: "" }, delivery: "steer" });

      expect(store.get(stateKey("s1"))).toEqual({ schema: 1, enabled: true });
      expect(prompts.at(-1)?.text).toContain("Mushroom: ON");
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("reports an unreadable state instead of claiming OFF", async () => {
    const original = process.env.XDG_CONFIG_HOME;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mushroom-handoff-"));
    process.env.XDG_CONFIG_HOME = dir;
    try {
      fs.mkdirSync(path.join(dir, "opencode"));
      fs.writeFileSync(path.join(dir, "opencode", ".ponytail-active"), "full");

      const { commands, prompts, store } = await start(new Map(), true, true);
      await commands.get("mushroom")?.execute({ sessionID: "s1", prompt: { text: "on" }, delivery: "steer" });

      expect(store.size).toBe(0);
      expect(prompts.at(-1)?.text).toContain("could not be read");
      expect(prompts.at(-1)?.text).not.toContain("Mushroom: OFF");
    } finally {
      if (original === undefined) delete process.env.XDG_CONFIG_HOME;
      else process.env.XDG_CONFIG_HOME = original;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("mushroom command", () => {
  test("off saves the state and replies with the state line", async () => {
    const { commands, prompts, store } = await start();

    await commands.get("mushroom")?.execute({ sessionID: "s1", prompt: { text: "off" }, delivery: "steer" });

    expect(store.get(stateKey("s1"))).toEqual({ schema: 1, enabled: false });
    expect(prompts.at(-1)?.text).toContain("Mushroom: OFF");
  });

  test("status reads a new session as OFF without writing", async () => {
    const { commands, prompts, store } = await start();

    await commands
      .get("mushroom")
      ?.execute({ sessionID: "s1", prompt: { text: "status" }, delivery: "steer" });

    expect(store.size).toBe(0);
    expect(prompts.at(-1)?.text).toContain("Mushroom: OFF");
  });

  test("invalid arguments leave the state alone and show usage", async () => {
    const { commands, prompts, store } = await start();

    await commands
      .get("mushroom")
      ?.execute({ sessionID: "s1", prompt: { text: "on off" }, delivery: "steer" });

    expect(store.size).toBe(0);
    expect(prompts.at(-1)?.text).toContain("usage of /mushroom");
  });
});

describe("rules injection", () => {
  test("context and compaction add rules only after Mushroom is turned on", async () => {
    const { hooks, store } = await start();
    store.set(stateKey("on"), { schema: 1, enabled: true });
    store.set(stateKey("off"), { schema: 1, enabled: false });

    for (const name of ["context", "compaction"]) {
      const hook = hooks.find((candidate) => candidate.name === name);
      if (!hook) throw new Error(`${name} hook not registered`);

      const fresh = { sessionID: "fresh", system: [] as { type: "text"; text: string }[] };
      await hook.run(fresh);
      expect(fresh.system).toHaveLength(0);

      const on = { sessionID: "on", system: [] as { type: "text"; text: string }[] };
      await hook.run(on);
      expect(on.system).toHaveLength(1);

      const off = { sessionID: "off", system: [] as { type: "text"; text: string }[] };
      await hook.run(off);
      expect(off.system).toHaveLength(0);
    }
  });
});
