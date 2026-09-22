/**
 * speclite loop plugin for OpenCode.
 *
 * OpenCode has no blocking Stop hook, but a plugin can observe `session.idle` and re-prompt
 * the same session through the SDK client. That gives the same loop the Claude/Codex Stop
 * hooks give, over the same brain: hooks/loop-check.sh decides, this file only translates.
 *
 * Decision comes from loop-check.sh (exit 0 = keep going, exit 1 = stop, reason on stdout).
 * No mode/halt logic lives here — see hooks/loop-check.sh.
 *
 * Install: copied to ~/.config/opencode/plugins/ (global) or .opencode/plugins/ (project)
 * by `node bin/install.js --only opencode`.
 *
 * Caveat: `session.idle` is advisory. In headless `opencode run` it can race the process
 * exiting, so the supported headless path stays `bin/loop.sh`. This plugin targets
 * interactive sessions.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PROMPT =
  "A loop mode is enabled (specs/lite/.mode is semi-auto or full-auto) and no halt marker " +
  "is set. Run the speclite-run skill now to advance the speclite pipeline.";

// Resolve the brain. The installer drops it in a sibling `speclite/hooks/` dir rather than
// inside plugins/ — OpenCode loads every module it finds in plugins/, so nothing else
// belongs there. SPECLITE_HOME overrides; the last candidate is a source checkout.
function findBrain() {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.SPECLITE_HOME && join(process.env.SPECLITE_HOME, "hooks", "loop-check.sh"),
    join(here, "..", "speclite", "hooks", "loop-check.sh"),
    join(here, "..", "..", "hooks", "loop-check.sh"),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}

export const SpecliteLoop = async ({ client, directory }) => {
  const brain = findBrain();

  return {
    event: async ({ event }) => {
      if (event?.type !== "session.idle") return;
      if (!brain) return;

      // Exit 0 = keep looping. Anything else = stop (loop off, or a gate was reached).
      const decision = spawnSync("bash", [brain, directory], { encoding: "utf8" });
      if (decision.status !== 0) return;

      const sessionID = event.properties?.sessionID;
      if (!sessionID) return;

      await client.session.promptAsync({
        path: { id: sessionID },
        body: { parts: [{ type: "text", text: PROMPT }] },
      });
    },
  };
};

export default SpecliteLoop;
