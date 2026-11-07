import { describe, expect, test } from "bun:test";
import { compareVersions, packageProblems } from "../scripts/release.ts";

const pkg = {
  name: "mushroom-mentor",
  version: "0.1.1",
  license: "MIT",
  repository: { type: "git", url: "https://example.com/repo.git" },
  files: ["src", "rules"],
};

describe("compareVersions", () => {
  test("orders numeric parts", () => {
    expect(compareVersions("0.1.1", "0.1.0")).toBeGreaterThan(0);
    expect(compareVersions("0.1.0", "0.1.1")).toBeLessThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.10.0", "0.9.9")).toBeGreaterThan(0);
  });

  test("ignores a prerelease suffix", () => {
    expect(compareVersions("0.1.1-beta.1", "0.1.1")).toBe(0);
  });
});

describe("packageProblems", () => {
  test("accepts a new version above the latest", () => {
    expect(packageProblems(pkg, { versions: ["0.1.0"], latest: "0.1.0" })).toEqual([]);
  });

  test("accepts a first publish", () => {
    expect(packageProblems(pkg, null)).toEqual([]);
  });

  test("rejects an already published version", () => {
    const problems = packageProblems(pkg, { versions: ["0.1.1"], latest: "0.1.1" });
    expect(problems.some((problem) => problem.includes("already published"))).toBe(true);
  });

  test("rejects a version not above latest", () => {
    const problems = packageProblems(pkg, { versions: ["0.1.0", "0.2.0"], latest: "0.2.0" });
    expect(problems.some((problem) => problem.includes("greater than latest"))).toBe(true);
  });

  test("rejects a malformed version", () => {
    expect(packageProblems({ ...pkg, version: "0.1" }, null)).toContain('version "0.1" is not x.y.z');
  });

  test("rejects missing metadata", () => {
    const problems = packageProblems({ name: undefined, version: "0.1.1", files: [] }, null);
    expect(problems).toContain("package.json has no name");
    expect(problems).toContain("package.json has no license");
    expect(problems).toContain("package.json has no repository");
    expect(problems).toContain('files must include "rules"');
    expect(problems).toContain('files must include "src"');
  });
});
