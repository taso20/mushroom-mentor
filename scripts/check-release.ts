import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { type Package, packageProblems, type RegistryState } from "./release.ts";

async function loadRegistry(name: string): Promise<RegistryState> {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`registry returned ${response.status} for ${name}`);
  const data = (await response.json()) as {
    versions?: Record<string, unknown>;
    "dist-tags"?: { latest?: string };
  };
  return {
    versions: Object.keys(data.versions ?? {}),
    latest: data["dist-tags"]?.latest,
  };
}

function gitOutput(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as Package;
const registry = pkg.name ? await loadRegistry(pkg.name) : null;
const problems = packageProblems(pkg, registry);

if (process.env.RELEASE_CHECK_ALLOW_DIRTY !== "1" && gitOutput(["status", "--porcelain"])) {
  problems.push("working tree is not clean; commit before publishing");
}

if (gitOutput(["tag", "-l", `v${pkg.version}`])) {
  problems.push(`tag v${pkg.version} already exists`);
}

if (problems.length > 0) {
  console.error(`Release check failed for ${pkg.name}@${pkg.version}:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Release check passed for ${pkg.name}@${pkg.version}`);
