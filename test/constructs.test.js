// test/constructs.test.js
const test = require('node:test');
const assert = require('node:assert');
const C = require('../src/authoring/constructs.js');

test('Monitor.toCanonical (api)', () => {
  const c = new C.Monitor({ type: 'api', logicalId: 'home', name: 'Home', schedule: '300', locations: ['us-east-1'],
    request: { url: 'https://x', method: 'GET' }, assertions: [{ type: 'statusCode', comparison: 'equals', value: 200 }] }).toCanonical();
  assert.strictEqual(c.kind, 'check'); assert.strictEqual(c.type, 'api');
  assert.strictEqual(c.logicalId, 'home'); assert.strictEqual(c.request.url, 'https://x');
});

test('Monitor carries the right type + type-specific block for each check type', () => {
  assert.strictEqual(new C.Monitor({ type: 'browser', logicalId: 'b', name: 'B', browser: { script: 'x' } }).toCanonical().type, 'browser');
  assert.strictEqual(new C.Monitor({ type: 'multistep', logicalId: 'm', name: 'M', steps: [] }).toCanonical().type, 'multistep');
  const tcp = new C.Monitor({ type: 'tcp', logicalId: 't', name: 'T', tcp: { host: 'h', port: 1 } }).toCanonical();
  assert.strictEqual(tcp.type, 'tcp'); assert.deepStrictEqual(tcp.tcp, { host: 'h', port: 1 });
  assert.strictEqual(new C.Monitor({ type: 'heartbeat', logicalId: 'h', name: 'H', heartbeat: { scheduleMode: 'interval', interval: 300 } }).toCanonical().type, 'heartbeat');
});

test('Monitor rejects an unknown/missing type', () => {
  assert.throws(() => new C.Monitor({ logicalId: 'x', name: 'x' }), /type must be one of/);
  assert.throws(() => new C.Monitor({ type: 'ftp', logicalId: 'x' }), /type must be one of/);
});

test('primitive constructs set the right kind', () => {
  assert.strictEqual(new C.Group({ logicalId: 'g', name: 'G' }).toCanonical().kind, 'group');
  assert.strictEqual(new C.AlertRule({ logicalId: 'a', metric: 'responseTime', condition: 'above', conditionValue: '2000', check: 'home' }).toCanonical().kind, 'alertRule');
  assert.strictEqual(new C.Maintenance({ logicalId: 'w', name: 'W', startsAt: 1, endsAt: 2 }).toCanonical().kind, 'maintenanceWindow');
  assert.strictEqual(new C.Dashboard({ logicalId: 'd', name: 'D', visibility: 'private' }).toCanonical().kind, 'dashboard');
  assert.strictEqual(new C.StatusPage({ logicalId: 's', title: 'S', slug: 's' }).toCanonical().kind, 'statusPage');
});

test('StatusPage carries title/slug/components(monitors) and drops unknown fields', () => {
  const c = new C.StatusPage({
    logicalId: 'sp', title: 'Acme', slug: 'acme', enabled: true, removePoweredBy: true,
    groups: [{ id: 'g', name: 'Core', order: 0 }],
    components: [{ id: 'c', name: 'API', groupId: 'g', monitors: ['home', 'api'] }],
    branding: { brandColor: '#5353a4' },
    junk: 'drop',                                  // not in STATUS_PAGE_FIELDS
  }).toCanonical();
  assert.strictEqual(c.kind, 'statusPage');
  assert.strictEqual(c.logicalId, 'sp');
  assert.strictEqual(c.title, 'Acme');             // status pages use `title`, not `name`
  assert.strictEqual(c.slug, 'acme');
  assert.strictEqual(c.enabled, true);
  assert.deepStrictEqual(c.components[0].monitors, ['home', 'api']);   // check refs as logicalIds
  assert.strictEqual(c.branding.brandColor, '#5353a4');
  assert.ok(!('junk' in c), 'unknown field dropped');
  assert.ok(!('name' in c), 'no name field on a status page');
});

test('StatusPage requires logicalId', () => {
  assert.throws(() => new C.StatusPage({ title: 'x', slug: 'x' }), /logicalId/);
});

test('requires logicalId', () => {
  assert.throws(() => new C.Monitor({ type: 'api', name: 'x' }), /logicalId/);
  assert.throws(() => new C.Group({ name: 'x' }), /logicalId/);
});

test('StatusPage carries customDomain', () => {
  const c = new C.StatusPage({ logicalId: 'sp', title: 'A', slug: 'a', customDomain: 'status.acme.com' }).toCanonical();
  assert.strictEqual(c.customDomain, 'status.acme.com');
});

test('toCanonical is plain JSON (round-trippable)', () => {
  const c = new C.Monitor({ type: 'api', logicalId: 'h', name: 'H', request: { url: 'https://x', method: 'GET' } }).toCanonical();
  assert.deepStrictEqual(JSON.parse(JSON.stringify(c)), c);
});

test('AlertChannel carries type + secret-ref fields and requires logicalId', () => {
  const c = new C.AlertChannel({ logicalId: 'oncall-pd', type: 'pagerduty', routingKey: '{{secrets.PD}}' }).toCanonical();
  assert.strictEqual(c.kind, 'alertChannel');
  assert.strictEqual(c.type, 'pagerduty');
  assert.strictEqual(c.routingKey, '{{secrets.PD}}');
  assert.throws(() => new C.AlertChannel({ type: 'email' }), /logicalId/);
});

test('Variable carries value; logicalId == key; requires logicalId', () => {
  const c = new C.Variable({ logicalId: 'BASE_URL', value: 'https://x' }).toCanonical();
  assert.strictEqual(c.kind, 'variable');
  assert.strictEqual(c.logicalId, 'BASE_URL');
  assert.strictEqual(c.value, 'https://x');
  assert.throws(() => new C.Variable({ value: 'x' }), /logicalId/);
});
