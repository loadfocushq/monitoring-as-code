// src/commands/get.js — show one deployed resource by logicalId (read-only, via /mac/state).
'use strict';
const yaml = require('js-yaml');
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { MacClient } = require('../client');
const { withJson, emit } = require('../output');

const BUCKETS = ['checks', 'groups', 'alertRules', 'maintenanceWindows', 'dashboards', 'statusPages', 'alertChannels', 'variables'];

function register(program) {
  const cmd = program.command('get <logicalId>')
    .description('Show one deployed resource by logicalId')
    .option('--project <p>', 'project (defaults to loadfocus.config)')
    .option('--status', "also show the check's latest run status", false);
  withJson(cmd);
  cmd.action(async (logicalId, opts) => {
    let project = opts.project;
    if (!project) { try { project = loadProjectConfig().project; } catch (e) { /* none */ } }
    if (!project) { console.error('No project — pass --project or set it in loadfocus.config.'); process.exit(1); }
    const client = new MacClient(resolveCredentials(process.env, readConfigFile()));
    const state = await client.getState(project);
    const resources = (state && state.resources) || {};
    let found = null, foundKind = null;
    for (const b of BUCKETS) { const m = (resources[b] || []).find((r) => r.logicalId === logicalId); if (m) { found = m; foundKind = b; break; } }
    if (!found) { console.error(`No resource with logicalId "${logicalId}" in project "${project}".`); process.exit(1); }
    let status;
    if (opts.status && foundKind === 'checks') {                      // only checks have run status
      const s = await client.status(project, [logicalId]);
      status = ((s && s.statuses) || [])[0];
    }
    // Read-only custom-domain runtime status (status pages) — comes from state.runtime, NEVER the diff.
    const domainRt = foundKind === 'statusPages' && state && state.runtime && state.runtime.statusPages && state.runtime.statusPages[logicalId];
    const payload = (status || domainRt) ? Object.assign({ resource: found }, status ? { status } : {}, domainRt ? { customDomainStatus: domainRt } : {}) : found;
    emit(opts, payload, () => {
      console.log(yaml.dump(found, { lineWidth: 120, noRefs: true, sortKeys: false }));
      if (status) console.log(`# status: ${status.status}${status.lastCheckTime ? ' (last run ' + new Date(status.lastCheckTime).toISOString() + ')' : ''}`);
      if (domainRt) console.log(`# custom domain: ${domainRt.customDomain}  [${domainRt.verified ? 'verified' : 'pending DNS'}, cert: ${domainRt.certStatus}]`);
    });
  });
}
module.exports = { register };
