// test/confirm.test.js
const test = require('node:test');
const assert = require('node:assert');
const { isNonInteractive } = require('../src/confirm.js');

test('forced non-interactive via LOADFOCUS_NONINTERACTIVE', () => {
  assert.strictEqual(isNonInteractive({ LOADFOCUS_NONINTERACTIVE: '1' }, { isTTY: true }), true);
});

test('CI markers imply non-interactive even with a TTY', () => {
  assert.strictEqual(isNonInteractive({ GITHUB_ACTIONS: 'true' }, { isTTY: true }), true);
  assert.strictEqual(isNonInteractive({ CI: '1' }, { isTTY: true }), true);
  assert.strictEqual(isNonInteractive({ GITLAB_CI: 'true' }, { isTTY: true }), true);
});

test('interactive: clean env + TTY stdin', () => {
  assert.strictEqual(isNonInteractive({}, { isTTY: true }), false);
});

test('non-TTY stdin (piped) is non-interactive', () => {
  assert.strictEqual(isNonInteractive({}, { isTTY: false }), true);
});
