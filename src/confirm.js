// src/confirm.js — interactivity detection + a y/N prompt. A destructive command in CI / an agent
// must NOT block on a prompt nobody can answer; callers use isNonInteractive() to emit a
// machine-readable "confirmation required" signal (exit 2) instead of hanging.
'use strict';
const readline = require('readline');

// Common CI markers; LOADFOCUS_NONINTERACTIVE=1 forces it; otherwise fall back to a non-TTY stdin.
const CI_VARS = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'BUILDKITE', 'JENKINS_URL', 'TF_BUILD', 'TEAMCITY_VERSION'];

function isNonInteractive(env, stream) {
  env = env || process.env;
  if (env.LOADFOCUS_NONINTERACTIVE === '1') return true;
  if (CI_VARS.some((k) => env[k])) return true;
  const s = stream || process.stdin;
  return !(s && s.isTTY);
}

function promptYesNo(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => { rl.close(); resolve(/^y(es)?$/i.test(String(ans).trim())); });
  });
}

module.exports = { isNonInteractive, promptYesNo, CI_VARS };
