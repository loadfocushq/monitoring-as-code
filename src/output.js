// src/output.js — opt-in machine-readable output. Commands build a structured result object and a
// human renderer; `emit` prints one or the other based on the --json flag (so CI/agents can parse
// us while humans still get readable text).
'use strict';

function withJson(cmd) { return cmd.option('--json', 'output machine-readable JSON', false); }

// Returns true when JSON was printed (so callers can `if (emit(...)) return;` to skip human output).
function emit(opts, data, human) {
  if (opts && opts.json) { console.log(JSON.stringify(data, null, 2)); return true; }
  if (typeof human === 'function') human(); else if (human != null) console.log(human);
  return false;
}

module.exports = { withJson, emit };
