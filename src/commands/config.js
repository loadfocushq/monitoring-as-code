// src/commands/config.js — `config set --apikey --teamid [--api-url]` persists credentials.
'use strict';
const { readConfigFile, saveConfigFile, resolveCredentials, CONFIG_PATH } = require('../credentials');

function register(program) {
  const cfg = program.command('config').description('Manage CLI configuration');
  cfg.command('set')
    .description('Save apikey / teamId / api url to ~/.loadfocus/config.json')
    .option('--apikey <key>', 'LoadFocus API key')
    .option('--teamid <id>', 'team id the apikey belongs to')
    .option('--api-url <url>', 'override the API base URL (self-hosted/dev; default https://apimonitor.loadfocus.com)')
    .action((opts) => {
      if (!opts.apikey && !opts.teamid && !opts.apiUrl) {
        console.error('Nothing to set — pass at least one of --apikey / --teamid / --api-url.');
        process.exit(1);
      }
      const file = readConfigFile();
      if (opts.apikey) file.apikey = opts.apikey;
      if (opts.teamid) file.teamId = opts.teamid;
      if (opts.apiUrl) file.apiBaseUrl = opts.apiUrl;
      saveConfigFile(file);
      console.log('Saved to ' + CONFIG_PATH);
    });
  cfg.command('show').description('Show resolved credentials (apikey masked)').action(() => {
    const c = resolveCredentials(process.env, readConfigFile());
    console.log(JSON.stringify({ apikey: c.apikey ? '***' + String(c.apikey).slice(-4) : null, teamId: c.teamId, apiBaseUrl: c.apiBaseUrl }, null, 2));
  });
}
module.exports = { register };
