// test/serialize.test.js
const test = require('node:test');
const assert = require('node:assert');
const yaml = require('js-yaml');
const { serializeResource, importFilename } = require('../src/authoring/serialize.js');
const { parseYamlResources } = require('../src/authoring/yamlResource.js');

test('serializeResource → YAML that parses back to the same resource', () => {
  const r = { kind: 'check', type: 'api', logicalId: 'home', name: 'Home', schedule: '300', locations: ['us-east-1'], request: { url: 'https://x', method: 'GET' }, assertions: [] };
  const text = serializeResource(r);
  assert.deepStrictEqual(parseYamlResources(text), [r]);
});

test('serializeResource strips any server-only fields defensively', () => {
  const text = serializeResource({ kind: 'group', logicalId: 'g', name: 'G', id: 'guid', team_id: 't', managed: true, project: 'p' });
  const back = yaml.load(text);
  for (const k of ['id', 'team_id', 'managed', 'project']) assert.ok(!(k in back), k);
  assert.strictEqual(back.logicalId, 'g');
});

test('importFilename = <logicalId>.<kind>.yaml', () => {
  assert.strictEqual(importFilename({ kind: 'check', logicalId: 'home-api' }), 'home-api.check.yaml');
  assert.strictEqual(importFilename({ kind: 'group', logicalId: 'web' }), 'web.group.yaml');
  assert.strictEqual(importFilename({ kind: 'maintenanceWindow', logicalId: 'wk' }), 'wk.maintenanceWindow.yaml');
});

test('importFilename rejects a path-traversal logicalId from a semi-trusted server (HIGH #6)', () => {
  for (const bad of ['../../etc/evil', '/abs/pwn', 'a/b', 'a\\b', 'x\0y', '..']) {
    assert.throws(() => importFilename({ kind: 'check', logicalId: bad }), /unsafe logicalId/, `should reject ${JSON.stringify(bad)}`);
  }
});

test('importFilename rejects an unknown/forged kind', () => {
  assert.throws(() => importFilename({ kind: 'evil', logicalId: 'ok' }), /unknown resource kind/);
  assert.throws(() => importFilename({ kind: '../check', logicalId: 'ok' }), /unknown resource kind/);
});
