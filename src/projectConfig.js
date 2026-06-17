// src/projectConfig.js — load + normalize loadfocus.config.{json,yaml,js}.
'use strict';
const fs = require('fs');
const path = require('path');

const RESERVED = '(unmanaged)';
// Match every resource kind, not just checks — `import` writes `<logicalId>.<kind>.yaml`
// (e.g. web.group.yaml, slow.alertRule.yaml), so a check-only default would silently drop
// groups/alertRules/maintenance/dashboards on an import→deploy round trip.
const DEFAULT_MATCH = ['**/*.{check,group,alertRule,maintenanceWindow,dashboard}.{yaml,yml,js}'];

function normalizeProjectConfig(raw) {
  raw = raw || {};
  const project = typeof raw.project === 'string' ? raw.project.trim() : '';
  if (!project) throw new Error('loadfocus.config: `project` is required');
  if (project === RESERVED) throw new Error(`loadfocus.config: project "${RESERVED}" is reserved`);
  return {
    project,
    defaults: raw.defaults || {},
    checkMatch: Array.isArray(raw.checkMatch) && raw.checkMatch.length ? raw.checkMatch : DEFAULT_MATCH.slice(),
    apiBaseUrl: raw.apiBaseUrl || null,
  };
}

// Find + load the config file from cwd (json/yaml/js). Returns the normalized config.
function loadProjectConfig(cwd) {
  cwd = cwd || process.cwd();
  const candidates = ['loadfocus.config.json', 'loadfocus.config.yaml', 'loadfocus.config.yml', 'loadfocus.config.js'];
  for (const name of candidates) {
    const p = path.join(cwd, name);
    if (!fs.existsSync(p)) continue;
    let raw;
    if (name.endsWith('.js')) raw = require(p);
    else if (name.endsWith('.json')) raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    else raw = require('js-yaml').load(fs.readFileSync(p, 'utf8'));
    return normalizeProjectConfig(raw && raw.default ? raw.default : raw);
  }
  throw new Error('No loadfocus.config.{json,yaml,js} found in ' + cwd);
}

module.exports = { normalizeProjectConfig, loadProjectConfig, RESERVED, DEFAULT_MATCH };
