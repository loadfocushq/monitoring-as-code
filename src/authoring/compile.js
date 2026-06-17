// src/authoring/compile.js — apply project defaults + validate logicalId uniqueness + bucket
// resources into the {checks,groups,alertRules,maintenanceWindows,dashboards} deploy payload.
'use strict';

const GROUP_KEY = { check: 'checks', group: 'groups', alertRule: 'alertRules', maintenanceWindow: 'maintenanceWindows', dashboard: 'dashboards', statusPage: 'statusPages', alertChannel: 'alertChannels', variable: 'variables' };

// Defaults fill a CHECK's locations/schedule/alertChannels when absent — but locations are
// skipped for grouped checks (the group supplies them via run-time inheritance).
function applyDefaults(resource, defaults) {
  if (resource.kind !== 'check' || !defaults) return resource;
  const r = Object.assign({}, resource);
  if (r.schedule === undefined && defaults.schedule !== undefined) r.schedule = defaults.schedule;
  if (r.alertChannels === undefined && defaults.alertChannels !== undefined) r.alertChannels = defaults.alertChannels;
  if (r.locations === undefined && !r.group && defaults.locations !== undefined) r.locations = defaults.locations;
  return r;
}

function compileResources(resources, defaults) {
  const payload = { checks: [], groups: [], alertRules: [], maintenanceWindows: [], dashboards: [], statusPages: [], alertChannels: [], variables: [] };
  const seen = new Set();
  for (const raw of (resources || [])) {
    const key = `${raw.kind}::${raw.logicalId}`;
    if (seen.has(key)) throw new Error(`Duplicate ${raw.kind} logicalId "${raw.logicalId}"`);
    seen.add(key);
    const r = applyDefaults(raw, defaults);
    const bucket = GROUP_KEY[r.kind];
    if (!bucket) throw new Error(`Unknown resource kind "${r.kind}"`);
    payload[bucket].push(r);
  }
  return payload;
}

module.exports = { applyDefaults, compileResources, GROUP_KEY };
