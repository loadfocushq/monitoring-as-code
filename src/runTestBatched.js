// src/runTestBatched.js — POST checks to /mac/test in batches (server caps at 20/request) and
// aggregate the results. Pure over an injected client.test(checks)→{results}.
'use strict';

const DEFAULT_BATCH = 20;

async function runTestBatched(client, checks, batchSize) {
  const size = batchSize || DEFAULT_BATCH;
  const results = [];
  for (let i = 0; i < (checks || []).length; i += size) {
    const res = await client.test(checks.slice(i, i + size));
    results.push(...((res && res.results) || []));
  }
  return results;
}

module.exports = { runTestBatched, DEFAULT_BATCH };
