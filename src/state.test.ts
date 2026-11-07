import { describe, expect, test } from "bun:test";
import type { Plugin } from "@opencode/plugin";
import { isEnabled, readState, runSerial, stateKey, writeState } from "./state.ts";

function fakeContext(store = new Map<string, unknown>()): Plugin.Context {
  return {
    storage: {
      get: async (key: string) => store.get(key),
      set: async (key: string, value: unknown) => {
        store.set(key, value);
      },
      remove: async (key: string) => {
        store.delete(key);
      },
      scan: async () => ({ entries: [] }),
    },
  } as unknown as Plugin.Context;
}

describe("session state", () => {
  test("an unregistered session starts new, which counts as ON", async () => {
    const ctx = fakeContext();
    expect(await readState(ctx, "s1")).toBe("new");
  });

  test("saves and reads on and off", async () => {
    const ctx = fakeContext();
    await writeState(ctx, "s1", true);
    expect(await readState(ctx, "s1")).toBe("on");
    await writeState(ctx, "s1", false);
    expect(await readState(ctx, "s1")).toBe("off");
  });

  test("keeps sessions separate", async () => {
    const ctx = fakeContext();
    await writeState(ctx, "s1", false);
    expect(await readState(ctx, "s1")).toBe("off");
    expect(await readState(ctx, "s2")).toBe("new");
  });

  test("does not treat bad or unknown values as registered", async () => {
    const ctx = fakeContext(
      new Map<string, unknown>([
        [stateKey("bad"), "on"],
        [stateKey("old"), { schema: 0, enabled: true }],
        [stateKey("partial"), { schema: 1 }],
      ]),
    );
    expect(await readState(ctx, "bad")).toBe("unknown");
    expect(await readState(ctx, "old")).toBe("unknown");
    expect(await readState(ctx, "partial")).toBe("unknown");
  });
});

describe("isEnabled", () => {
  test("counts new and on as enabled, off and unknown as disabled", () => {
    expect(isEnabled("on")).toBe(true);
    expect(isEnabled("new")).toBe(true);
    expect(isEnabled("off")).toBe(false);
    expect(isEnabled("unknown")).toBe(false);
  });
});

describe("runSerial", () => {
  test("runs tasks for one session in order", async () => {
    const order: number[] = [];
    const first = runSerial("s1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push(1);
    });
    const second = runSerial("s1", async () => {
      order.push(2);
    });

    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });

  test("does not block another session", async () => {
    const order: string[] = [];
    const slow = runSerial("s1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("s1");
    });
    const quick = runSerial("s2", async () => {
      order.push("s2");
    });

    await Promise.all([slow, quick]);
    expect(order).toEqual(["s2", "s1"]);
  });
});
