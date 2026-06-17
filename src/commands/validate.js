// src/commands/validate.js — compile authoring locally, then (by default) a server dry-run for
// authoritative validation. Changes nothing. Exit 1 on any error — good as a pre-commit / PR gate.
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { loadResources } = require('../authoring/loadResources');
const { compileResources } = require('../authoring/compile');
const { MacClient } = require('../client');
const { withJson, emit } = require('../output');

const BUCKETS = ['checks', 'groups', 'alertRules', 'maintenanceWindows', 'dashboards', 'statusPages', 'alertChannels', 'variables'];

function register(program) {
  const cmd = program.command('validate')
    .description('Validate authoring locally + against the server (no changes applied)')
    .option('--no-server', 'only validate locally (skip the server dry-run)');
  withJson(cmd);
  cmd.action(async (opts) => {
    const cfg = loadProjectConfig();

    // 1) Local compile — catches YAML/construct/enum/required-field/duplicate errors offline.
    let payload, count = 0;
    try {
      const resources = await loadResources(process.cwd(), cfg.checkMatch);
      payload = compileResources(resources, cfg.defaults);
      count = BUCKETS.reduce((n, k) => n + ((payload[k] || []).length), 0);
      // Channels are referenced by NAME; a managed channel's name defaults to its logicalId. An
      // explicit name ≠ logicalId still works, but references must use that name — warn to avoid the
      // common "I referenced the logicalId but the name differs" mistake.
      for (const ch of (payload.alertChannels || [])) {
        if (ch.name && ch.name !== ch.logicalId && !opts.json)
          console.error(`warning: alertChannel "${ch.logicalId}" has name "${ch.name}" ≠ logicalId — reference it by its name ("${ch.name}"), not "${ch.logicalId}".`);
      }
    } catch (e) {
      if (!emit(opts, { ok: false, stage: 'local', error: e.message })) console.error('Local validation failed: ' + e.message);
      process.exit(1);
    }

    // 2) Server dry-run — authoritative canonical validation, mutates nothing.
    if (opts.server === false) {
      emit(opts, { ok: true, stage: 'local', resources: count }, `OK — ${count} resource(s) compiled locally.`);
      return;
    }
    const client = new MacClient(resolveCredentials(process.env, readConfigFile()));
    let plan;
    try { const r = await client.deploy({ project: cfg.project, dryRun: true, resources: payload }); plan = r.plan; }
    catch (e) {
      if (!emit(opts, { ok: false, stage: 'server', resources: count, error: e.message }))
        console.error(`Local OK (${count} resource(s)), but server validation failed: ${e.message}`);
      process.exit(1);
    }
    emit(opts, { ok: true, resources: count, plan }, `OK — ${count} resource(s) valid (local compile + server dry-run).`);
  });
}
module.exports = { register };
