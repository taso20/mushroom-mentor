import { existsSync } from "node:fs";

export type RegistryState = { versions: string[]; latest?: string } | null;

export function compareVersions(a: string, b: string): number {
  const left = a.split("-")[0].split(".").map(Number);
  const right = b.split("-")[0].split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export type Package = {
  name?: string;
  version?: string;
  license?: string;
  repository?: unknown;
  files?: string[];
};

export function packageProblems(pkg: Package, registry: RegistryState): string[] {
  const problems: string[] = [];
  const version = pkg.version ?? "";

  if (!pkg.name) problems.push("package.json has no name");
  if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push(`version "${version}" is not x.y.z`);
  if (!pkg.license) problems.push("package.json has no license");
  if (!pkg.repository) problems.push("package.json has no repository");
  if (!pkg.files?.includes("rules")) problems.push('files must include "rules"');
  if (!pkg.files?.includes("src")) problems.push('files must include "src"');

  for (const path of ["rules/SKILL.md", "LICENSE", "README.md", "README.ja.md"]) {
    if (!existsSync(path)) problems.push(`missing ${path}`);
  }

  if (registry) {
    if (registry.versions.includes(version)) {
      problems.push(`version ${version} is already published; bump it`);
    } else if (registry.latest && compareVersions(version, registry.latest) <= 0) {
      problems.push(`version ${version} must be greater than latest ${registry.latest}`);
    }
  }

  return problems;
}
