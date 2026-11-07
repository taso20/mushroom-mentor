import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Plugin, Skill } from "@opencode/plugin";
import { parseMushroomArgs } from "./args.ts";
import { isPonytailActive } from "./ponytail.ts";
import { isEnabled, readState, runSerial, stateKey, writeState } from "./state.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const rulesPath = path.resolve(here, "../rules/SKILL.md");

// The rules file is the only source of the ruleset. Frontmatter is for discovery by
// other harnesses; the prompt gets the body.
function readRules(): string {
  const text = fs.readFileSync(rulesPath, "utf8");
  const frontmatter = /^---\r?\n[\s\S]*?\r?\n---\r?\n/.exec(text);
  return (frontmatter ? text.slice(frontmatter[0].length) : text).trim();
}

function stateWord(enabled: boolean): string {
  return enabled ? "ON" : "OFF";
}

function stateLine(enabled: boolean): string {
  return `Mushroom: ${stateWord(enabled)}`;
}

async function isPonytailLoadedAndActive(ctx: Plugin.Context): Promise<boolean> {
  try {
    const { data: plugins } = await ctx.plugin.list();
    if (!plugins.some((plugin) => plugin.id?.includes("ponytail") ?? false)) return false;
    return isPonytailActive();
  } catch (error) {
    console.error("mushroom: failed to check Ponytail", error);
    return false;
  }
}

export default Plugin.define({
  id: "mushroom",

  async setup(ctx) {
    // A broken rules file must not take the commands down with it.
    let rules: string | undefined;
    try {
      rules = readRules();
    } catch (error) {
      console.error("mushroom: failed to read rules; commands keep working", error);
    }

    if (rules) {
      await ctx.skill.transform((editor) => {
        editor.add({
          id: Skill.ID.make("mushroom-rules"),
          name: Skill.Name.make("Mushroom"),
          description: "Human-friendly coding rules applied by Mushroom",
          autoinvoke: false,
          path: Skill.Info.fields.path.make(rulesPath),
          content: rules,
        });
      });

      const inject = async (event: { sessionID: string; system: { type: "text"; text: string }[] }) => {
        try {
          const state = await readState(ctx, event.sessionID);
          if (state === "unknown") {
            console.error(`mushroom: state for session ${event.sessionID} is unreadable; skipping rules`);
            return;
          }
          if (!isEnabled(state)) return;
          event.system.push({ type: "text", text: rules });
        } catch (error) {
          console.error("mushroom: failed to apply rules", error);
        }
      };
      await ctx.session.hook("context", inject);
      await ctx.session.hook("compaction", inject);
    }

    await ctx.command.transform((editor) => {
      editor.add({
        name: "mushroom",
        description: "Turn Mushroom on or off, or show its state",
        execute: async ({ sessionID, prompt, delivery }) => {
          const action = parseMushroomArgs(prompt.text);
          if (action === "invalid") {
            await ctx.session.prompt({
              sessionID,
              delivery,
              text: 'Show the usage of /mushroom: "/mushroom" turns Mushroom on (or keeps it on), "/mushroom on", "/mushroom off", "/mushroom status". Do not change the state. Answer briefly in the user\'s language.',
            });
            return;
          }

          if (action === "status") {
            const state = await readState(ctx, sessionID).catch(() => "unknown" as const);
            if (state === "unknown") {
              await ctx.session.prompt({
                sessionID,
                delivery,
                text: "Tell the user in their language that the Mushroom state could not be read. Do not guess it.",
              });
              return;
            }
            const enabled = isEnabled(state);
            await ctx.session.prompt({
              sessionID,
              delivery,
              text: `The Mushroom state is ${stateWord(enabled)}. Reply with exactly "${stateLine(enabled)}" and nothing else.`,
            });
            return;
          }

          const enabled = action === "on";
          const ponytail = enabled ? await isPonytailLoadedAndActive(ctx) : false;
          try {
            await runSerial(sessionID, () => writeState(ctx, sessionID, enabled));
          } catch (error) {
            console.error("mushroom: failed to save state", error);
            await ctx.session.prompt({
              sessionID,
              delivery,
              text: `Tell the user in their language that Mushroom could not be turned ${stateWord(enabled)} and the previous state was kept. Do not claim success.`,
            });
            return;
          }

          const warning = ponytail
            ? " Ponytail is still active; tell the user in their language to run /ponytail off. Do not change Ponytail yourself."
            : "";
          await ctx.session.prompt({
            sessionID,
            delivery,
            text: `Mushroom is now ${stateWord(enabled)}. Reply with a short line containing exactly "${stateLine(enabled)}".${warning}`,
          });
        },
      });

      editor.add({
        name: "mushroom-help",
        description: "Show the Mushroom quick reference",
        execute: async ({ sessionID, prompt, delivery }) => {
          await ctx.session.prompt({
            sessionID,
            delivery,
            text: `Show the Mushroom quick reference. Change nothing and do not persist anything.

Mushroom applies human-friendly coding rules to every turn in this session.
- /mushroom: turn on, or keep on, and show the state
- /mushroom on, /mushroom off: set the state
- /mushroom status: show the state without changing it
- /mushroom-review [target]: review changes without changing code
- /mushroom-help: this card

Ponytail cannot run at the same time; run /ponytail off to stop it.

State is ON or OFF for one session. New sessions start ON.
Rules cover naming, structure, why comments, reuse, safety, and honest reasons. Minimum line count is not a goal.

Answer in the user's language.${prompt.text.trim() ? ` Ignore these arguments: ${prompt.text.trim()}` : ""}`,
          });
        },
      });

      editor.add({
        name: "mushroom-review",
        description: "Review changes for correctness, safety, readability, and why",
        execute: async ({ sessionID, prompt, delivery }) => {
          const target = prompt.text.trim();
          const files = prompt.files?.map(({ uri, source, name, description }) => ({
            uri,
            source,
            name,
            description,
          }));
          await ctx.session.prompt({
            sessionID,
            delivery,
            files,
            text: `Review the requested change like the senior developer who will be paged when it breaks.

Target: ${target || "the uncommitted changes. If there are none, the last commit. If there is no commit, say there is nothing to review."}

Read the code the change touches: callers of every changed function, the functions it calls, the tests, and the README. A change can break code it does not touch.

Report in this order:
1. The target and comparison range, then 2 to 3 sentences on what the change does.
2. Numbered findings grouped Must fix, Should fix, Nice to have. Each finding: a bold title with path:line, then what it is, the problem, the fix, and the cost of skipping it.
3. A verdict, then what was not checked and which checks were not run.

Check correctness, safety and data loss, edge cases, missing tests, readability, naming, structure, and missing or invented why comments. Do not change code. Do not invent a reason for a change. Answer in the user's language.`,
          });
        },
      });
    });

    if (await isPonytailLoadedAndActive(ctx)) {
      console.warn("mushroom: Ponytail is active; run /ponytail off to avoid duplicate rules");
    }

    const abort = new AbortController();
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ types: ["session.deleted"], signal: abort.signal })) {
          try {
            await ctx.storage.remove(stateKey(event.data.sessionID));
          } catch (error) {
            console.error("mushroom: failed to remove state", error);
          }
        }
      } catch (error) {
        if (!abort.signal.aborted) console.error("mushroom: session cleanup stopped", error);
      }
    })();

    return () => abort.abort();
  },
});
