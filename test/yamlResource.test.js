// test/yamlResource.test.js
const test = require('node:test');
const assert = require('node:assert');
const { parseYamlResources } = require('../src/authoring/yamlResource.js');

test('single resource doc → [resource]', () => {
  const r = parseYamlResources('kind: check\ntype: api\nlogicalId: home\nname: Home\n');
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].logicalId, 'home');
  assert.strictEqual(r[0].kind, 'check');
});

test('YAML list → multiple resources', () => {
  const r = parseYamlResources('- {kind: group, logicalId: g1, name: G}\n- {kind: check, type: tcp, logicalId: c1, name: C}\n');
  assert.deepStrictEqual(r.map((x) => x.logicalId), ['g1', 'c1']);
});

test('multi-doc (---) → multiple resources', () => {
  const r = parseYamlResources('kind: group\nlogicalId: g1\nname: G\n---\nkind: check\ntype: api\nlogicalId: c1\nname: C\n');
  assert.strictEqual(r.length, 2);
});

test('rejects a resource missing kind or logicalId', () => {
  assert.throws(() => parseYamlResources('type: api\nname: x\n'), /kind/);
  assert.throws(() => parseYamlResources('kind: check\ntype: api\nname: x\n'), /logicalId/);
});

test('rejects a check without a type', () => {
  assert.throws(() => parseYamlResources('kind: check\nlogicalId: c\nname: x\n'), /type/);
});

test('empty/blank yaml → []', () => {
  assert.deepStrictEqual(parseYamlResources('  \n'), []);
});
