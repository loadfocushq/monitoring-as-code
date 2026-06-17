// src/commands/destroy.js — deploy an EMPTY resource set → deletes all of the project's managed
// resources. Always destructive → requires --yes or interactive confirm.
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { MacClient } = require('../client');
const { formatPlan } = require('../render');
const { deployFlow } = require('../deployFlow');
const { withJson, emit } = require('../output');
const { isNonInteractive, promptYesNo } = require('../confirm');

function makeConfirm(jsonMode) {
  return (plan) => {
    if (isNonInteractive()) {
      const payload = { status: 'confirmation_required', deletes: plan.deleted.length, plan };
      if (jsonMode) console.error(JSON.stringify(payload));
      else console.error(`\nRefusing to destroy ${plan.deleted.length} resource(s) without --yes in a non-interactive environment (CI/agent). Re-run with --yes to proceed.`);
      process.exitCode = 2;
      return Promise.resolve(false);
    }
    return promptYesNo(`\nDESTROY ${plan.deleted.length} resource(s) in this project? [y/N] `);
  };
}

function register(program) {
  const cmd = program.command('destroy').description('Delete ALL managed resources in the project')
    .option('--yes', 'skip confirmation (CI)', false);
  withJson(cmd);
  cmd.action(async (opts) => {
      const creds = resolveCredentials(process.env, readConfigFile());
      const cfg = loadProjectConfig();
      const empty = { checks: [], groups: [], alertRules: [], maintenanceWindows: [], dashboards: [], statusPages: [], alertChannels: [], variables: [] };
      const client = new MacClient(creds);
      const result = await deployFlow(client, cfg.project, empty, { apply: true, yes: opts.yes, confirm: makeConfirm(opts.json) });
      if (result.aborted) {
        if (process.exitCode === 2) process.exit(2);
        if (!opts.json) console.log('Aborted.'); else console.error(JSON.stringify({ status: 'aborted' }));
        process.exit(1);
      }
      if (emit(opts, { plan: result.plan, applied: result.applied })) return;
      console.log(formatPlan(result.plan || {}));
      console.log(`\nDestroyed ${((result.applied || {}).deleted || []).length} resource(s).`);
    });
}
module.exports = { register };
