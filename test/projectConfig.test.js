// test/projectConfig.test.js
const test = require('node:test');
const assert = require('node:assert');
const { normalizeProjectConfig } = require('../src/projectConfig.js');

test('normalizeProjectConfig requires a non-empty, non-reserved project', () => {
  assert.throws(() => normalizeProjectConfig({}), /project/);
  assert.throws(() => normalizeProjectConfig({ project: '' }), /project/);
  assert.throws(() => normalizeProjectConfig({ project: '(unmanaged)' }), /reserved/);
});

test('applies defaults + checkMatch fallback', () => {
  const c = normalizeProjectConfig({ project: 'acme-prod' });
  assert.strictEqual(c.project, 'acme-prod');
  assert.deepStrictEqual(c.defaults, {});
  assert.deepStrictEqual(c.checkMatch, ['**/*.{check,group,alertRule,maintenanceWindow,dashboard}.{yaml,yml,js}']);
});

test('preserves provided defaults + checkMatch + apiBaseUrl', () => {
  const c = normalizeProjectConfig({ project: 'p', defaults: { locations: ['us-east-1'], schedule: '300' }, checkMatch: ['x/*.yaml'], apiBaseUrl: 'https://h' });
  assert.deepStrictEqual(c.defaults.locations, ['us-east-1']);
  assert.deepStrictEqual(c.checkMatch, ['x/*.yaml']);
  assert.strictEqual(c.apiBaseUrl, 'https://h');
});
