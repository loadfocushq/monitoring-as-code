// test/client.test.js
const test = require('node:test');
const assert = require('node:assert');
const { MacClient } = require('../src/client.js');

function fakeFetch(calls, response) {
  return async (url, opts) => { calls.push({ url, opts }); return {
    ok: response.status < 400, status: response.status,
    json: async () => response.body, text: async () => JSON.stringify(response.body),
  }; };
}

const creds = { apikey: 'k', teamId: 't', apiBaseUrl: 'https://h' };

test('getState GETs /mac/state with auth headers + project query', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: { project: 'p', resources: {} } }));
  const r = await c.getState('p');
  assert.strictEqual(calls[0].url, 'https://h/api/test/appapimonitoring/mac/state?project=p');
  assert.strictEqual(calls[0].opts.headers['loadfocus-auth'], 'k');
  assert.strictEqual(calls[0].opts.headers['team-id'], 't');         // server reads team-id (NOT loadfocus-team)
  assert.strictEqual(r.project, 'p');
});

test('team-id header omitted when no teamId (server falls back to the account default team)', async () => {
  const calls = [];
  const c = new MacClient({ apikey: 'k', apiBaseUrl: 'https://h' }, fakeFetch(calls, { status: 200, body: {} }));
  await c.getState('p');
  assert.ok(!('team-id' in calls[0].opts.headers), 'team-id must be absent when teamId unset');
});

test('deploy POSTs /mac/deploy with the body', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: { dryRun: true, plan: {}, planHash: 'h' } }));
  await c.deploy({ project: 'p', dryRun: true, resources: { checks: [] } });
  assert.strictEqual(calls[0].url, 'https://h/api/test/appapimonitoring/mac/deploy');
  assert.strictEqual(calls[0].opts.method, 'POST');
  assert.deepStrictEqual(JSON.parse(calls[0].opts.body).project, 'p');
});

test('test POSTs /mac/test', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: { ok: true, results: [] } }));
  const r = await c.test([{ kind: 'check', type: 'api', logicalId: 'a' }]);
  assert.strictEqual(calls[0].url, 'https://h/api/test/appapimonitoring/mac/test');
  assert.strictEqual(r.ok, true);
});

test('trigger POSTs /mac/trigger with {project, logicalIds}', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: { ok: true, results: [] } }));
  const r = await c.trigger({ project: 'p', logicalIds: ['home'] });
  assert.strictEqual(calls[0].url, 'https://h/api/test/appapimonitoring/mac/trigger');
  assert.strictEqual(calls[0].opts.method, 'POST');
  assert.deepStrictEqual(JSON.parse(calls[0].opts.body), { project: 'p', logicalIds: ['home'] });
  assert.strictEqual(r.ok, true);
});

test('status GETs /mac/status with project + repeated logicalId query', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: { project: 'p', statuses: [] } }));
  await c.status('p', ['home', 'api']);
  assert.strictEqual(calls[0].url, 'https://h/api/test/appapimonitoring/mac/status?project=p&logicalId=home&logicalId=api');
});

test('secret/variable methods hit the /api/secrets + /api/variables endpoints (not the /mac base)', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: { keys: [] } }));
  await c.listSecrets();
  await c.setSecret('TOK', 's3cr3t');
  await c.deleteSecret('TOK');
  await c.listVariables();
  await c.setVariable('REGION', 'eu');
  await c.deleteVariable('REGION');
  assert.strictEqual(calls[0].url, 'https://h/api/secrets/list-keys');
  assert.strictEqual(calls[1].url, 'https://h/api/secrets/store');
  assert.deepStrictEqual(JSON.parse(calls[1].opts.body), { key: 'TOK', value: 's3cr3t' });
  assert.strictEqual(calls[2].url, 'https://h/api/secrets/delete?key=TOK');
  assert.strictEqual(calls[2].opts.method, 'DELETE');
  assert.strictEqual(calls[3].url, 'https://h/api/variables/list-keys');
  assert.strictEqual(calls[4].url, 'https://h/api/variables/store');
  assert.strictEqual(calls[5].url, 'https://h/api/variables/delete?key=REGION');
});

test('a redirect (302 → login) is an ERROR, not silent success (whoami false-positive fix)', async () => {
  const redirectFetch = async () => ({ ok: false, status: 302, json: async () => ({}), text: async () => '<html>login</html>' });
  const c = new MacClient(creds, redirectFetch);
  await assert.rejects(() => c.getState('(unmanaged)'), (e) => /redirect/i.test(e.message) && e.status === 302);
});

test('a non-2xx response throws with the server error', async () => {
  const c = new MacClient(creds, fakeFetch([], { status: 409, body: { error: 'stale-plan' } }));
  await assert.rejects(() => c.deploy({ project: 'p', dryRun: false }), /stale-plan/);
});

test('missing apikey throws before any request', async () => {
  const c = new MacClient({ teamId: 't', apiBaseUrl: 'https://h' }, fakeFetch([], { status: 200, body: {} }));
  await assert.rejects(() => c.getState('p'), /not logged in|apikey/i);
});

test('requests carry the x-loadfocus-cli-version header (drift signal)', async () => {
  const calls = [];
  const c = new MacClient(creds, fakeFetch(calls, { status: 200, body: {} }));
  await c.getState('p');
  const { version } = require('../package.json');
  assert.strictEqual(calls[0].opts.headers['x-loadfocus-cli-version'], version);
});

test('a network failure surfaces an actionable error with host + cause (not opaque "fetch failed")', async () => {
  const fetchThatThrows = async () => { const e = new Error('fetch failed'); e.cause = { code: 'ECONNREFUSED' }; throw e; };
  const c = new MacClient({ apikey: 'k', teamId: 't', apiBaseUrl: 'https://apimonitor.loadfocus.com' }, fetchThatThrows);
  await assert.rejects(() => c.getState('p'), (e) => /apimonitor\.loadfocus\.com/.test(e.message) && /ECONNREFUSED/.test(e.message) && /Could not reach/.test(e.message));
});

test('a request timeout surfaces a clear timeout message', async () => {
  const fetchThatTimesOut = async () => { const e = new Error('aborted'); e.name = 'TimeoutError'; throw e; };
  const c = new MacClient(creds, fetchThatTimesOut, { timeoutMs: 1234 });
  await assert.rejects(() => c.getState('p'), /timed out after 1234ms/);
});
