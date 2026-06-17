// src/authoring/constructs.js — programmatic (JS/TS) authoring → canonical. One Monitor() construct
// covers every check type via {type}; org primitives are Group/AlertRule/Maintenance/Dashboard.
// Thin: copy allowed fields through with kind/type stamped — the SERVER validates the canonical, so
// this just produces the same JSON shape as the YAML authoring.
'use strict';

const MONITOR_TYPES = ['api', 'browser', 'multistep', 'tcp', 'heartbeat'];
// Shared monitor fields + every type-specific block (only the present ones are copied).
const MONITOR_FIELDS = [
  'name', 'activated', 'muted', 'schedule', 'locations', 'group', 'retry', 'alertEvents', 'alertChannels',
  'request', 'assertions', 'browser', 'steps', 'tcp', 'heartbeat',
];
const GROUP_FIELDS = ['name', 'description', 'locations', 'alertChannels', 'alertEvents', 'muted', 'activated'];
const ALERT_RULE_FIELDS = ['name', 'check', 'metric', 'condition', 'conditionValue', 'alertChannels', 'alertEvents', 'enabled'];
const MAINTENANCE_FIELDS = ['name', 'enabled', 'startsAt', 'endsAt', 'repeat', 'timezone', 'weekdays', 'repeatUntil', 'targets'];
const DASHBOARD_FIELDS = ['name', 'description', 'slug', 'visibility', 'checks', 'window'];
// Status pages use `title` (not `name`); a component's check refs live in `monitors` (logicalIds).
const STATUS_PAGE_FIELDS = [
  'slug', 'title', 'description', 'enabled', 'listedPublicly', 'hideFromSearch', 'groups', 'components',
  'branding', 'navLinks', 'historyDays', 'uptimeDecimals', 'minIncidentLength', 'notMonitoredAsGreen',
  'locale', 'timezone', 'autoUpdatesFromIncidents', 'removePoweredBy', 'showMetrics', 'allowSubscribers', 'restrict',
  'customDomain',
];
// Alert channels: `name` is the reference target (default == logicalId); secret fields take a
// `{{secrets.X}}` reference. Type-specific: email→email, slack/microsoftteams/webhook/discord→
// webhookUrl, pagerduty→routingKey, opsgenie→apiKey+opsgenieRegion.
const ALERT_CHANNEL_FIELDS = ['type', 'name', 'email', 'webhookUrl', 'routingKey', 'apiKey', 'opsgenieRegion'];

function pick(src, fields) {
  const o = {};
  for (const f of fields) if (src[f] !== undefined) o[f] = src[f];
  return o;
}
function requireLogicalId(props) {
  if (!props || !props.logicalId) throw new Error('construct: logicalId is required');
}

// new Monitor({ type, logicalId, name, ...type-specific }) — type ∈ MONITOR_TYPES.
class Monitor {
  constructor(props) {
    requireLogicalId(props);
    if (!props.type || MONITOR_TYPES.indexOf(props.type) === -1)
      throw new Error(`Monitor: type must be one of ${MONITOR_TYPES.join(', ')}`);
    this._c = Object.assign({ kind: 'check', type: props.type, logicalId: props.logicalId }, pick(props, MONITOR_FIELDS));
  }
  toCanonical() { return JSON.parse(JSON.stringify(this._c)); }
}

class Primitive {
  constructor(kind, props, fields) {
    requireLogicalId(props);
    this._c = Object.assign({ kind, logicalId: props.logicalId }, pick(props, fields));
  }
  toCanonical() { return JSON.parse(JSON.stringify(this._c)); }
}
class Group extends Primitive { constructor(p) { super('group', p, GROUP_FIELDS); } }
class AlertRule extends Primitive { constructor(p) { super('alertRule', p, ALERT_RULE_FIELDS); } }
class Maintenance extends Primitive { constructor(p) { super('maintenanceWindow', p, MAINTENANCE_FIELDS); } }
class Dashboard extends Primitive { constructor(p) { super('dashboard', p, DASHBOARD_FIELDS); } }
class StatusPage extends Primitive { constructor(p) { super('statusPage', p, STATUS_PAGE_FIELDS); } }
class AlertChannel extends Primitive { constructor(p) { super('alertChannel', p, ALERT_CHANNEL_FIELDS); } }
// A non-secret variable. logicalId == the variable KEY (referenced at run time as {{vars.KEY}}).
class Variable extends Primitive { constructor(p) { super('variable', p, ['value']); } }

module.exports = { Monitor, Group, AlertRule, Maintenance, Dashboard, StatusPage, AlertChannel, Variable, MONITOR_TYPES };
