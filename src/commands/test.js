// src/commands/test.js — compile project checks → POST /mac/test → render; exit 1 on any failure.
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { loadResources } = require('../authoring/loadResources');
const { compileResources } = require('../authoring/compile');
const { MacClient } = require('../client');
const { runTestBatched } = require('../runTestBatched');
const { formatTestResults } = require('../render');
const { withJson, emit } = require('../output');

function register(program) {
  const cmd = program.command('test').description('Run project checks ad-hoc (no persistence) and report pass/fail');
  withJson(cmd);
  cmd.action(async (opts) => {
    const creds = resolveCredentials(process.env, readConfigFile());
    const cfg = loadProjectConfig();
    const resources = await loadResources(process.cwd(), cfg.checkMatch);
    const payload = compileResources(resources, cfg.defaults);
    if (payload.checks.length === 0) { emit(opts, { results: [], failed: 0 }, 'No checks to test.'); return; }
    const client = new MacClient(creds);
    // The server caps /mac/test at 20 checks/request — batch + aggregate (runTestBatched).
    const results = await runTestBatched(client, payload.checks);
    const { text, failed } = formatTestResults(results);
    emit(opts, { results, failed }, text);
    if (failed > 0) process.exit(1);
  });
}
module.exports = { register };
