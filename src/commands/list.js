// src/commands/list.js — inventory of a project's deployed resources (read-only, via /mac/state).
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { loadProjectConfig } = require('../projectConfig');
const { MacClient } = require('../client');
const { withJson, emit } = require('../output');
const { formatInventory } = require('../render');

function resolveProject(opts) {
  if (opts.project) return opts.project;
  try { return loadProjectConfig().project; } catch (e) { return null; }
}

function register(program) {
  const cmd = program.command('list')
    .description("List the project's deployed resources")
    .option('--project <p>', 'project (defaults to loadfocus.config)')
    .option('--status', "also show each check's latest run status (up/down/degraded/unknown)", false);
  withJson(cmd);
  cmd.action(async (opts) => {
    const project = resolveProject(opts);
    if (!project) { console.error('No project — pass --project or set it in loadfocus.config.'); process.exit(1); }
    const client = new MacClient(resolveCredentials(process.env, readConfigFile()));
    const state = await client.getState(project);
    const resources = (state && state.resources) || {};
    let statusByLid = null;
    if (opts.status) {
      const s = await client.status(project);
      statusByLid = Object.fromEntries(((s && s.statuses) || []).map((x) => [x.logicalId, x.status]));
    }
    emit(opts, { project, resources, statuses: statusByLid || undefined }, () => console.log(formatInventory(project, resources, statusByLid)));
  });
}
module.exports = { register };
