// src/commands/trigger.js — run already-deployed checks on demand (no persistence). The server
// resolves which checks to run from {project, logicalIds}; the CLI just passes the filter. Exit 1
// on any failure (CI-friendly).
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { MacClient } = require('../client');
const { formatTestResults } = require('../render');
const { withJson, emit } = require('../output');

function collect(v, acc) { acc.push(v); return acc; }

function register(program) {
  const cmd = program.command('trigger')
    .description('Run already-deployed checks on demand (no persistence); exit 1 on failure')
    .option('--project <p>', 'project (defaults to loadfocus.config)')
    .option('--id <logicalId>', 'run only this check by logicalId (repeatable)', collect, [])
    .addHelpText('after', `
Examples:
  $ loadfocus-monitoring trigger                      # run all deployed checks in the project
  $ loadfocus-monitoring trigger --id home --id api   # run only these`);
  withJson(cmd);
  cmd.action(async (opts) => {
    let project = opts.project;
    if (!project) { try { project = loadProjectConfig().project; } catch (e) { /* none */ } }
    if (!project) {
      if (!emit(opts, { ok: false, error: 'no-project' })) console.error('No project — pass --project or set it in loadfocus.config.');
      process.exit(1);
    }
    const client = new MacClient(resolveCredentials(process.env, readConfigFile()));
    const res = await client.trigger({ project, logicalIds: opts.id });
    const results = (res && res.results) || [];
    const { text, failed } = formatTestResults(results);
    emit(opts, { ok: res && res.ok, results, failed }, text);
    if (failed > 0 || (res && res.ok === false)) process.exit(1);
  });
}
module.exports = { register };
