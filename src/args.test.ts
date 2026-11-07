import { describe, expect, test } from "bun:test";
import { parseMushroomArgs } from "./args.ts";

describe("parseMushroomArgs", () => {
  test("bare command turns on", () => {
    expect(parseMushroomArgs("")).toBe("on");
    expect(parseMushroomArgs("   ")).toBe("on");
  });

  test("accepts on, off, and status", () => {
    expect(parseMushroomArgs("on")).toBe("on");
    expect(parseMushroomArgs("off")).toBe("off");
    expect(parseMushroomArgs("status")).toBe("status");
  });

  test("ignores case and surrounding spaces", () => {
    expect(parseMushroomArgs(" ON ")).toBe("on");
    expect(parseMushroomArgs("Off\t")).toBe("off");
  });

  test("rejects unknown words and extra words", () => {
    expect(parseMushroomArgs("default full")).toBe("invalid");
    expect(parseMushroomArgs("on off")).toBe("invalid");
    expect(parseMushroomArgs("help")).toBe("invalid");
  });
});
