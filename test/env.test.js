// test/env.test.js
const test = require('node:test');
const assert = require('node:assert');
const { resolveValue } = require('../src/commands/env.js');

test('resolveValue returns a provided value verbatim (no stdin read)', async () => {
  assert.strictEqual(await resolveValue('hunter2'), 'hunter2');
  assert.strictEqual(await resolveValue(''), '');   // explicit empty passes through (caller rejects it)
});

test('resolveValue refuses to hang on an interactive TTY when no value is piped', async () => {
  const origTTY = process.stdin.isTTY;
  const origExit = process.exit;
  process.stdin.isTTY = true;
  let exited = null; process.exit = (code) => { exited = code; throw new Error('exit'); };
  try {
    await assert.rejects(() => resolveValue(undefined), /exit/);
    assert.strictEqual(exited, 1);
  } finally { process.stdin.isTTY = origTTY; process.exit = origExit; }
});
