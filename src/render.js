// src/render.js — human-readable rendering of /mac/test results + a deploy plan.
'use strict';

function formatTestResults(results) {
  if (!results || !results.length) return { text: 'No checks ran.', failed: 0 };
  const lines = [];
  let failed = 0;
  for (const r of results || []) {
    if (r.status === 'fail' || r.status === 'error') failed++;
    const mark = { pass: '✓', fail: '✗', error: '✗', degraded: '~', skipped: '·', pending: '?' }[r.status] || '?';
    lines.push(`  ${mark} ${r.logicalId} (${r.type}): ${r.status}${r.error ? ' — ' + r.error : ''}`);
  }
  const text = lines.join('\n') + `\n\n${results.length} checks, ${failed} failed`;
  return { text, failed };
}

function formatPlan(plan) {
  const c = (a) => (a || []).length;
  // `adopted` = existing unmanaged resources this deploy will claim (stamp managed) in place.
  const lines = [`Plan: ${c(plan.created)} created, ${c(plan.updated)} updated, ${c(plan.adopted)} adopted, ${c(plan.deleted)} deleted, ${c(plan.unchanged)} unchanged` +
                  (c(plan.unmanaged) ? `, ${c(plan.unmanaged)} unmanaged (ignored)` : '')];
  const detail = [];
  for (const e of plan.created || []) detail.push(`  + ${e.kind} ${e.logicalId}`);
  for (const e of plan.updated || []) detail.push(`  ~ ${e.kind} ${e.logicalId}`);
  for (const e of plan.adopted || []) detail.push(`  ⇲ ${e.kind} ${e.logicalId}`);
  for (const e of plan.deleted || []) detail.push(`  - ${e.kind} ${e.logicalId}`);
  if (detail.length) lines.push('  (+ create  ~ update  ⇲ adopt  - delete)', ...detail);
  return lines.join('\n');
}

const BUCKET_KIND = { checks: 'check', groups: 'group', alertRules: 'alertRule', maintenanceWindows: 'maintenanceWindow', dashboards: 'dashboard', statusPages: 'statusPage', alertChannels: 'alertChannel', variables: 'variable' };

// Human inventory of a project's deployed resources (from /mac/state), grouped by kind. When a
// statusByLid map is given, annotate CHECK rows with their latest run status (checks run; the other
// kinds don't).
function formatInventory(project, resources, statusByLid) {
  resources = resources || {};
  const lines = [];
  let total = 0;
  for (const bucket of Object.keys(BUCKET_KIND)) {
    const list = resources[bucket] || [];
    if (!list.length) continue;
    total += list.length;
    lines.push(`${BUCKET_KIND[bucket]} (${list.length}):`);
    for (const r of list) {
      const st = (statusByLid && bucket === 'checks' && statusByLid[r.logicalId]) ? `  [${statusByLid[r.logicalId]}]` : '';
      const label = r.name || r.title;   // status pages carry `title`, not `name`
      lines.push(`  ${r.logicalId}${label ? '  — ' + label : ''}${st}`);
    }
  }
  lines.push(`${total} resource(s) in project "${project}".`);
  return lines.join('\n');
}

module.exports = { formatTestResults, formatPlan, formatInventory };
