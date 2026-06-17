// src/commands/logout.js — clear saved credentials (apikey + team) from ~/.loadfocus/config.json.
'use strict';
const { readConfigFile, saveConfigFile, CONFIG_PATH } = require('../credentials');

function register(program) {
  program.command('logout')
    .description('Remove saved credentials from ~/.loadfocus/config.json')
    .action(() => {
      const file = readConfigFile();
      if (!file.apikey && !file.teamId) { console.log('Already logged out (no saved credentials).'); return; }
      delete file.apikey; delete file.teamId;       // keep any apiBaseUrl (config, not a credential)
      saveConfigFile(file);
      console.log('Logged out — cleared apikey + team from ' + CONFIG_PATH + '.');
    });
}
module.exports = { register };
