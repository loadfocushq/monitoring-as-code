// test/credentials.test.js
const test = require('node:test');
const assert = require('node:assert');
const { resolveCredentials, assertSafeBaseUrl, CONFIG_PATH } = require('../src/credentials.js');

test('env vars win over the config file', () => {
  const creds = resolveCredentials(
    { LOADFOCUS_API_KEY: 'envkey', LOADFOCUS_TEAM_ID: 'envteam', LOADFOCUS_API_URL: 'https://e.loadfocus.com' },
    { apikey: 'filekey', teamId: 'fileteam' });
  assert.deepStrictEqual(creds, { apikey: 'envkey', teamId: 'envteam', apiBaseUrl: 'https://e.loadfocus.com' });
});

test('assertSafeBaseUrl: refuses cleartext http to a non-loopback host (apikey leak)', () => {
  assert.throws(() => assertSafeBaseUrl('http://evil.example.com'), /cleartext http/);
});

test('assertSafeBaseUrl: refuses a non-http(s) scheme', () => {
  assert.throws(() => assertSafeBaseUrl('file:///etc/passwd'), /http\(s\)/);
  assert.throws(() => assertSafeBaseUrl('not a url'), /invalid apiBaseUrl/);
});

test('assertSafeBaseUrl: allows https loadfocus + http loopback for local dev', () => {
  assert.strictEqual(assertSafeBaseUrl('https://apimonitor.loadfocus.com'), 'https://apimonitor.loadfocus.com');
  assert.strictEqual(assertSafeBaseUrl('http://localhost:8068'), 'http://localhost:8068');
  assert.strictEqual(assertSafeBaseUrl('http://127.0.0.1:8068'), 'http://127.0.0.1:8068');
});

test('falls back to the config file when env is absent', () => {
  const creds = resolveCredentials({}, { apikey: 'filekey', teamId: 'fileteam' });
  assert.strictEqual(creds.apikey, 'filekey');
  assert.strictEqual(creds.teamId, 'fileteam');
});

test('apiBaseUrl defaults to the prod monitor host', () => {
  assert.strictEqual(resolveCredentials({}, {}).apiBaseUrl, 'https://apimonitor.loadfocus.com');
});

test('CONFIG_PATH is under the user home .loadfocus dir', () => {
  assert.match(CONFIG_PATH, /\.loadfocus[\/\\]config\.json$/);
});
