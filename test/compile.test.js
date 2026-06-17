// test/compile.test.js
const test = require('node:test');
const assert = require('node:assert');
const { applyDefaults, compileResources } = require('../src/authoring/compile.js');

test('applyDefaults fills locations/schedule on a check that lacks them + has no group', () => {
  const r = applyDefaults({ kind: 'check', type: 'api', logicalId: 'c', name: 'C' }, { locations: ['us-east-1'], schedule: '300' });
  assert.deepStrictEqual(r.locations, ['us-east-1']);
  assert.strictEqual(r.schedule, '300');
});

test('applyDefaults does NOT override explicit values, and skips locations for grouped checks', () => {
  const grouped = applyDefaults({ kind: 'check', type: 'api', logicalId: 'c', group: 'g', name: 'C' }, { locations: ['us-east-1'] });
  assert.ok(!('locations' in grouped), 'grouped check inherits locations from the group at run time');
  const explicit = applyDefaults({ kind: 'check', type: 'api', logicalId: 'c', schedule: '600', name: 'C' }, { schedule: '300' });
  assert.strictEqual(explicit.schedule, '600');
});

test('applyDefaults ignores non-checks (groups/etc.)', () => {
  const g = applyDefaults({ kind: 'group', logicalId: 'g', name: 'G' }, { locations: ['us-east-1'] });
  assert.ok(!('locations' in g) || g.locations === undefined);
});

test('compileResources buckets by kind into the deploy payload', () => {
  const out = compileResources([
    { kind: 'check', type: 'api', logicalId: 'c1', name: 'C1' },
    { kind: 'group', logicalId: 'g1', name: 'G1' },
    { kind: 'alertRule', logicalId: 'a1', metric: 'responseTime', condition: 'above', conditionValue: '1', check: 'c1' },
  ], {});
  assert.strictEqual(out.checks.length, 1);
  assert.strictEqual(out.groups.length, 1);
  assert.strictEqual(out.alertRules.length, 1);
  assert.deepStrictEqual(out.maintenanceWindows, []);
});

test('compileResources throws on a duplicate (kind, logicalId)', () => {
  assert.throws(() => compileResources([
    { kind: 'check', type: 'api', logicalId: 'dup', name: 'A' },
    { kind: 'check', type: 'api', logicalId: 'dup', name: 'B' },
  ], {}), /duplicate/i);
});

test('compileResources allows the same logicalId across DIFFERENT kinds', () => {
  const out = compileResources([
    { kind: 'check', type: 'api', logicalId: 'web', name: 'W' },
    { kind: 'group', logicalId: 'web', name: 'W' },
  ], {});
  assert.strictEqual(out.checks.length, 1);
  assert.strictEqual(out.groups.length, 1);
});
