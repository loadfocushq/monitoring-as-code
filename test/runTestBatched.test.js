// test/runTestBatched.test.js
const test = require('node:test');
const assert = require('node:assert');
const { runTestBatched } = require('../src/runTestBatched.js');

function fakeClient(calls) {
  return { test: async (checks) => { calls.push(checks.length); return { results: checks.map((c) => ({ logicalId: c.logicalId, type: c.type, status: 'pass' })) }; } };
}

test('batches into <=20 per request and aggregates all results', async () => {
  const calls = [];
  const checks = Array.from({ length: 45 }, (_, i) => ({ logicalId: 'c' + i, type: 'api' }));
  const results = await runTestBatched(fakeClient(calls), checks, 20);
  assert.deepStrictEqual(calls, [20, 20, 5]);          // 3 batches
  assert.strictEqual(results.length, 45);              // all aggregated
  assert.strictEqual(results[44].logicalId, 'c44');
});

test('single batch when <= size', async () => {
  const calls = [];
  const results = await runTestBatched(fakeClient(calls), [{ logicalId: 'a', type: 'api' }], 20);
  assert.deepStrictEqual(calls, [1]);
  assert.strictEqual(results.length, 1);
});

test('empty checks → no requests, empty results', async () => {
  const calls = [];
  const results = await runTestBatched(fakeClient(calls), [], 20);
  assert.deepStrictEqual(calls, []);
  assert.deepStrictEqual(results, []);
});
