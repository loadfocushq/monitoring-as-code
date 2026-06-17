// test/deployFlow.test.js
const test = require('node:test');
const assert = require('node:assert');
const { deployFlow } = require('../src/deployFlow.js');

function fakeClient(script) {
  const calls = [];
  return { calls, deploy: async (body) => { calls.push(body); return script(body, calls.length); } };
}

test('dry-run only (apply:false) returns the plan, never applies', async () => {
  const client = fakeClient(() => ({ dryRun: true, plan: { created: [{ kind: 'check', logicalId: 'a' }], updated: [], deleted: [], unchanged: [], unmanaged: [] }, planHash: 'h1' }));
  const r = await deployFlow(client, 'p', { checks: [] }, { apply: false });
  assert.strictEqual(client.calls.length, 1);
  assert.strictEqual(client.calls[0].dryRun, true);
  assert.strictEqual(r.dryRun, true);
});

test('apply with no deletions: dry-run then apply with planHash, no confirm needed', async () => {
  const client = fakeClient((body) => body.dryRun
    ? { dryRun: true, plan: { created: [{ kind: 'check', logicalId: 'a' }], updated: [], deleted: [], unchanged: [], unmanaged: [] }, planHash: 'h1' }
    : { dryRun: false, applied: { created: [{ logicalId: 'a' }], updated: [], deleted: [] }, plan: {}, planHash: 'h1' });
  const r = await deployFlow(client, 'p', { checks: [] }, { apply: true });
  assert.strictEqual(client.calls.length, 2);
  assert.strictEqual(client.calls[1].dryRun, false);
  assert.strictEqual(client.calls[1].planHash, 'h1');
  assert.ok(r.applied);
});

test('apply WITH deletions requires confirm; declining aborts before apply', async () => {
  const client = fakeClient(() => ({ dryRun: true, plan: { created: [], updated: [], deleted: [{ kind: 'check', logicalId: 'old' }], unchanged: [], unmanaged: [] }, planHash: 'h1' }));
  const r = await deployFlow(client, 'p', { checks: [] }, { apply: true, confirm: async () => false });
  assert.strictEqual(client.calls.length, 1);
  assert.strictEqual(r.aborted, true);
});

test('apply WITH deletions + yes → applies with planHash + confirmDestroyCount', async () => {
  const plan = { created: [], updated: [], deleted: [{ kind: 'check', logicalId: 'old' }], unchanged: [], unmanaged: [] };
  const client = fakeClient((body) => body.dryRun ? { dryRun: true, plan, planHash: 'h1' } : { dryRun: false, applied: { deleted: [{ logicalId: 'old' }] }, planHash: 'h1' });
  const r = await deployFlow(client, 'p', { checks: [] }, { apply: true, yes: true });
  assert.strictEqual(client.calls[1].dryRun, false);
  assert.strictEqual(client.calls[1].confirmDestroyCount, 1);
  assert.ok(r.applied);
});

test('a dry-run response with no plan throws a clear error (malformed/incompatible server)', async () => {
  const client = fakeClient(() => ({ dryRun: true /* no plan */ }));
  await assert.rejects(() => deployFlow(client, 'p', { checks: [] }, { apply: false }), /no plan|incompatible/i);
});

test('stale-plan (409) on apply → recompute + retry once', async () => {
  let dryCount = 0;
  const plan = { created: [{ kind: 'check', logicalId: 'a' }], updated: [], deleted: [], unchanged: [], unmanaged: [] };
  const client = {
    calls: [],
    deploy: async (body) => {
      client.calls.push(body);
      if (body.dryRun) { dryCount++; return { dryRun: true, plan, planHash: 'h' + dryCount }; }
      if (body.planHash === 'h1') { const e = new Error('stale-plan'); e.status = 409; throw e; }
      return { dryRun: false, applied: {}, planHash: body.planHash };
    },
  };
  const r = await deployFlow(client, 'p', { checks: [] }, { apply: true });
  assert.ok(r.applied);
  assert.strictEqual(dryCount, 2);
});
