// test/render.test.js
const test = require('node:test');
const assert = require('node:assert');
const { formatTestResults, formatPlan, formatInventory } = require('../src/render.js');

test('formatTestResults: ok flag + per-check lines + counts', () => {
  const { text, failed } = formatTestResults([
    { logicalId: 'a', type: 'api', status: 'pass' },
    { logicalId: 'b', type: 'tcp', status: 'fail' },
    { logicalId: 'h', type: 'heartbeat', status: 'skipped' },
  ]);
  assert.match(text, /a.*pass/);
  assert.match(text, /b.*fail/);
  assert.strictEqual(failed, 1);
});

test('formatTestResults: degraded + pending are not failures', () => {
  const { failed } = formatTestResults([{ logicalId: 'a', type: 'api', status: 'degraded' }, { logicalId: 'b', type: 'api', status: 'pending' }]);
  assert.strictEqual(failed, 0);
});

test('formatPlan: shows created/updated/deleted/unchanged counts + lines', () => {
  const t = formatPlan({ created: [{ kind: 'check', logicalId: 'a' }], updated: [], deleted: [{ kind: 'group', logicalId: 'g' }], unchanged: [{ kind: 'check', logicalId: 'b' }], unmanaged: [] });
  assert.match(t, /created.*1/i);
  assert.match(t, /deleted.*1/i);
  assert.match(t, /\+ check a/);
  assert.match(t, /- group g/);
});

test('formatInventory groups deployed resources by kind with counts', () => {
  const t = formatInventory('acme', { checks: [{ logicalId: 'home', name: 'Home' }], groups: [{ logicalId: 'web' }], alertRules: [], maintenanceWindows: [], dashboards: [] });
  assert.match(t, /check \(1\)/);
  assert.match(t, /home {2}— Home/);
  assert.match(t, /group \(1\)/);
  assert.match(t, /2 resource\(s\) in project "acme"/);
});

test('formatInventory annotates only checks with status when a map is given', () => {
  const t = formatInventory('acme', { checks: [{ logicalId: 'home', name: 'Home' }], groups: [{ logicalId: 'web' }], alertRules: [], maintenanceWindows: [], dashboards: [] }, { home: 'down' });
  assert.match(t, /home {2}— Home {2}\[down\]/);
  assert.doesNotMatch(t, /web.*\[/);   // groups don't run → no status annotation
});

test('formatPlan: shows the adopted (claim) bucket', () => {
  const t = formatPlan({ created: [], updated: [], adopted: [{ kind: 'check', logicalId: 'imported' }], deleted: [], unchanged: [], unmanaged: [] });
  assert.match(t, /1 adopted/i);
  assert.match(t, /⇲ check imported/);
  assert.match(t, /⇲ adopt/);          // legend present
});
