# Mushroom

Coding rules for OpenCode that keep generated code clear, changeable, and
honest about why.

Mushroom is inspired by Ponytail. It does not depend on it, and you should not
run both at once.

[日本語 README](README.ja.md)

## Install

The package is not published yet. For now, add this directory to the `plugins`
array in `opencode.json(c)`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["/absolute/path/to/mushroom"]
}
```

After the first npm release, the package name will replace the path.

## Use

| Command | Effect |
| --- | --- |
| `/mushroom` | Turn on, or keep on, and show the state |
| `/mushroom on` | Turn on |
| `/mushroom off` | Turn off |
| `/mushroom status` | Show the state without changing it |
| `/mushroom-review [target]` | Review changes without changing code |
| `/mushroom-help` | Show the quick reference |

The state is per session. New sessions start ON. Rules apply to normal turns,
tool continuations, and compaction, not to title generation.

## Rules

The ruleset lives in `rules/SKILL.md`. It is the only source of the rules.

## License

MIT. See `LICENSE`.

## Development

```sh
npm install
npm run check    # Biome lint and format check
npm run verify   # Biome, typecheck, and tests
```
