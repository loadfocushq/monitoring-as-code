// src/commands/import.js — pull a project's server state → YAML files + loadfocus.config.
'use strict';
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { resolveCredentials, readConfigFile } = require('../credentials');
const { MacClient } = require('../client');
const { serializeResource, importFilename } = require('../authoring/serialize');
const { withJson, emit } = require('../output');

const BUCKETS = ['checks', 'groups', 'alertRules', 'maintenanceWindows', 'dashboards', 'statusPages', 'alertChannels', 'variables'];

function register(program) {
  const cmd = program.command('import').description("Pull a project's monitors from the server into YAML files")
    .requiredOption('--project <p>', 'project to import')
    .option('--out <dir>', 'output directory', 'monitors')
    .option('--force', 'overwrite existing files', false);
  withJson(cmd);
  cmd.action(async (opts) => {
      const creds = resolveCredentials(process.env, readConfigFile());
      const client = new MacClient(creds);
      const state = await client.getState(opts.project);
      const resources = (state && state.resources) || {};
      fs.mkdirSync(opts.out, { recursive: true });
      const outRoot = path.resolve(opts.out);
      const writtenFiles = [], skipped = [];
      const log = (m) => { if (!opts.json) console.log(m); };
      for (const bucket of BUCKETS) {
        for (const r of (resources[bucket] || [])) {
          const file = path.join(opts.out, importFilename(r));   // importFilename rejects traversal in the name
          // Defense in depth: assert the resolved path stays inside --out (belt to importFilename's braces).
          const resolved = path.resolve(file);
          if (resolved !== outRoot && !resolved.startsWith(outRoot + path.sep))
            throw new Error(`refusing to write outside ${opts.out}: ${file}`);
          if (fs.existsSync(file) && !opts.force) { log(`skip (exists): ${file}`); skipped.push(file); continue; }
          fs.writeFileSync(file, serializeResource(r));
          writtenFiles.push(file);
        }
      }
      const written = writtenFiles.length;
      const cfgPath = 'loadfocus.config.yaml';
      let wroteConfig = false;
      if (!fs.existsSync(cfgPath) && !fs.existsSync('loadfocus.config.json') && !fs.existsSync('loadfocus.config.js')) {
        fs.writeFileSync(cfgPath, yaml.dump({ project: opts.project, checkMatch: [`${opts.out}/**/*.yaml`] }));
        wroteConfig = true; log(`wrote ${cfgPath}`);
      }
      if (opts.json) { console.log(JSON.stringify({ project: opts.project, written, files: writtenFiles, skipped, wroteConfig }, null, 2)); return; }
      if (written === 0) {
        console.log(`No resources found in project "${opts.project}" — check the project name (and that it has monitors).`);
      } else {
        console.log(`Imported ${written} resource(s) from project "${opts.project}" into ${opts.out}/. Review, commit, then \`deploy --dry-run\`.`);
      }
    });
}
module.exports = { register };
