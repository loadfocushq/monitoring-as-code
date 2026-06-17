// src/commands/deploy.js — compile → dry-run plan → (confirm) → apply.
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { loadResources } = require('../authoring/loadResources');
const { compileResources } = require('../authoring/compile');
const { MacClient } = require('../client');
const { formatPlan } = require('../render');
const { deployFlow } = require('../deployFlow');
const { withJson, emit } = require('../output');
const { isNonInteractive, promptYesNo } = require('../confirm');

const BUCKETS = ['checks', 'groups', 'alertRules', 'maintenanceWindows', 'dashboards', 'statusPages', 'alertChannels', 'variables'];

// Confirm a destructive plan. In a non-interactive context (CI/agent) we can't prompt — emit a
// machine-readable "confirmation required" signal and set exit code 2 so the caller can react,
// rather than blocking forever on stdin. Interactive → y/N prompt.
function makeConfirm(jsonMode) {
  return (plan) => {
    if (isNonInteractive()) {
      const payload = { status: 'confirmation_required', deletes: plan.deleted.length, plan };
      if (jsonMode) console.error(JSON.stringify(payload));
      else console.error(`\nRefusing to delete ${plan.deleted.length} resource(s) without --yes in a non-interactive environment (CI/agent). Re-run with --yes to proceed.`);
      process.exitCode = 2;
      return Promise.resolve(false);
    }
    return promptYesNo(`\nThis will DELETE ${plan.deleted.length} resource(s). Continue? [y/N] `);
  };
}

function register(program) {
  const cmd = program.command('deploy').description('Reconcile the project to the server (create/update/adopt/delete)')
    .option('--dry-run', 'show the plan without applying anything', false)
    .option('--yes', 'skip the deletion confirmation prompt (for CI)', false)
    .option('--allow-empty', 'permit a deploy that loaded zero resources (would delete all managed)', false)
    .addHelpText('after', `
Examples:
  $ loadfocus-monitoring deploy --dry-run     # preview the plan, change nothing
  $ loadfocus-monitoring deploy               # apply (prompts before any deletions)
  $ loadfocus-monitoring deploy --yes         # apply non-interactively (CI; allows deletions)

Reads loadfocus.config.{yaml,json,js} (project + checkMatch) from the current directory.`);
  withJson(cmd);
  cmd.action(async (opts) => {
      const creds = resolveCredentials(process.env, readConfigFile());
      const cfg = loadProjectConfig();
      const resources = await loadResources(process.cwd(), cfg.checkMatch);
      const payload = compileResources(resources, cfg.defaults);

      // SAFETY: zero loaded resources makes the reconcile plan DELETE every managed resource. That
      // is almost always a wrong cwd or a checkMatch typo, not intent — refuse an APPLY unless
      // explicitly allowed (use `destroy` to intentionally wipe a project). A --dry-run is
      // non-mutating, so let it through — it actually SHOWS the delete-all plan as a warning.
      const total = BUCKETS.reduce((n, k) => n + ((payload[k] || []).length), 0);
      if (total === 0 && !opts.allowEmpty && !opts.dryRun) {
        if (opts.json) console.error(JSON.stringify({ status: 'empty-refused', checkMatch: cfg.checkMatch, cwd: process.cwd() }));
        else {
          console.error(`No resources loaded from checkMatch ${JSON.stringify(cfg.checkMatch)} in ${process.cwd()}.`);
          console.error('Refusing to deploy an empty project (it would DELETE all managed resources).');
          console.error('Fix your checkMatch / run from the project root, use `destroy` to intentionally delete all, or pass --allow-empty.');
        }
        process.exit(1);
      }

      const client = new MacClient(creds);
      const result = await deployFlow(client, cfg.project, payload, { apply: !opts.dryRun, yes: opts.yes, confirm: makeConfirm(opts.json) });

      if (result.dryRun) {
        if (emit(opts, { dryRun: true, plan: result.plan, planHash: result.planHash })) return;
        console.log(formatPlan(result.plan)); console.log(`\n(dry run — nothing applied; planHash ${result.planHash})`); return;
      }
      if (result.aborted) {
        if (process.exitCode === 2) process.exit(2);   // non-interactive confirmation required
        if (!opts.json) console.log('Aborted.'); else console.error(JSON.stringify({ status: 'aborted' }));
        process.exit(1);
      }
      if (emit(opts, { dryRun: false, plan: result.plan, applied: result.applied, planHash: result.planHash })) return;
      console.log(formatPlan(result.plan || {}));
      const a = result.applied || {};
      console.log(`\nApplied: ${(a.created || []).length} created, ${(a.updated || []).length} updated, ${(a.adopted || []).length} adopted, ${(a.deleted || []).length} deleted.`);
    });
}
module.exports = { register };
