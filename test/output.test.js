// test/output.test.js
const test = require('node:test');
const assert = require('node:assert');
const { emit } = require('../src/output.js');

function capture(fn) {
  const orig = console.log; const out = [];
  console.log = (...a) => out.push(a.join(' '));
  try { fn(); } finally { console.log = orig; }
  return out.join('\n');
}

test('emit prints JSON (not the human text) when opts.json', () => {
  const out = capture(() => emit({ json: true }, { a: 1 }, 'human'));
  assert.match(out, /"a": 1/);
  assert.doesNotMatch(out, /human/);
});

test('emit prints the human string when not json', () => {
  assert.strictEqual(capture(() => emit({ json: false }, { a: 1 }, 'human text')), 'human text');
});

test('emit runs the human function when not json', () => {
  let ran = false;
  const out = capture(() => emit({}, {}, () => { ran = true; console.log('fn ran'); }));
  assert.ok(ran);
  assert.strictEqual(out, 'fn ran');
});

test('emit returns true iff JSON was printed', () => {
  const orig = console.log; console.log = () => {};
  try {
    assert.strictEqual(emit({ json: true }, {}, 'x'), true);
    assert.strictEqual(emit({ json: false }, {}, 'x'), false);
    assert.strictEqual(emit({}, {}, 'x'), false);
  } finally { console.log = orig; }
});
