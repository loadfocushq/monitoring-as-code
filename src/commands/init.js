// src/commands/init.js — scaffold a project config + a sample monitor in the current directory.
'use strict';
const fs = require('fs');
const path = require('path');

const CONFIG = `# LoadFocus Monitoring-as-Code project config.
project: my-project          # <-- set this
checkMatch:
  - "monitors/**/*.{check,group,alertRule,maintenanceWindow,dashboard,statusPage,alertChannel,variable}.{yaml,yml,js}"
defaults:
  schedule: "300"
  locations: [us-east-1]
`;

const SAMPLE = `kind: check
type: api
logicalId: home
name: Home API
schedule: "300"
locations: [us-east-1]
request:
  url: "https://example.com"
  method: GET
assertions:
  - { type: statusCode, comparison: equals, value: 200 }
`;

function writeFile(file, content, force) {
  if (fs.existsSync(file) && !force) { console.log(`skip (exists): ${file}`); return false; }
  fs.mkdirSync(path.dirname(file) || '.', { recursive: true });
  fs.writeFileSync(file, content);
  console.log(`wrote ${file}`);
  return true;
}

function register(program) {
  program.command('init')
    .description('Scaffold a loadfocus.config.yaml + a sample monitor in the current directory')
    .option('--force', 'overwrite existing files', false)
    .action((opts) => {
      writeFile('loadfocus.config.yaml', CONFIG, opts.force);
      writeFile(path.join('monitors', 'home.check.yaml'), SAMPLE, opts.force);
      console.log('\nNext: set `project` in loadfocus.config.yaml, then `loadfocus-monitoring deploy --dry-run`.');
    });
}
module.exports = { register };
