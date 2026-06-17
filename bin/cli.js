#!/usr/bin/env node
'use strict';
const { Command } = require('commander');
const pkg = require('../package.json');
// Soft Node-engine warning (don't block — engines is advisory). Native fetch needs Node >=18.
const major = parseInt(process.versions.node, 10);
if (major < 18) console.error(`WARNING: Node ${process.versions.node} is below the supported >=18 — some features (fetch) may not work.`);

const program = new Command();
program.name('loadfocus-monitoring')
  .description('Monitoring as Code CLI for LoadFocus API Monitoring')
  .version(pkg.version)
  .showSuggestionAfterError()      // "did you mean …" on a typo'd command
  .showHelpAfterError('(run with --help for usage)');
require('../src/commands/login').register(program);
require('../src/commands/logout').register(program);
require('../src/commands/config').register(program);
require('../src/commands/whoami').register(program);
require('../src/commands/init').register(program);
require('../src/commands/validate').register(program);
require('../src/commands/test').register(program);
require('../src/commands/trigger').register(program);
require('../src/commands/list').register(program);
require('../src/commands/get').register(program);
require('../src/commands/deploy').register(program);
require('../src/commands/destroy').register(program);
require('../src/commands/import').register(program);
require('../src/commands/env').register(program);
program.parseAsync(process.argv).catch((e) => {
  // In --json mode emit a JSON error to stderr too, so an agent parsing the CLI gets structured
  // output on every path (stdout is never written on the throw path, so stdout JSON stays clean).
  if (process.argv.includes('--json')) console.error(JSON.stringify({ error: e.message }));
  else console.error('Error:', e.message);
  process.exit(1);
});
