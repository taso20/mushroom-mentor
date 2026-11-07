# Mushroom

## Before finishing any change

Run `npm run check` (Biome for code, rumdl for Markdown). Fix every
finding. Then run `npm run verify` (checks, typecheck, tests). Do not claim
work is done while either fails.

## Layout

- `rules/SKILL.md`: the only source of the coding rules.
- `src/index.ts`: plugin setup, hooks, and command handlers.
- `src/state.ts`: per-session state and write queue.
- `human-friendly-coding-spec.md`: the specification.
