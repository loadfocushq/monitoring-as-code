// src/commands/login.js — `login --apikey --teamid` (sugar over config set).
'use strict';
const { readConfigFile, saveConfigFile, CONFIG_PATH } = require('../credentials');
function register(program) {
  program.command('login')
    .description('Save your LoadFocus apikey + team id')
    .requiredOption('--apikey <key>', 'LoadFocus API key')
    .requiredOption('--teamid <id>', 'team id the apikey belongs to')
    .option('--api-url <url>', 'override the API base URL (self-hosted/dev)')
    .addHelpText('after', '\nThe key is stored at ~/.loadfocus/config.json (0600). In CI, prefer the\nLOADFOCUS_API_KEY / LOADFOCUS_TEAM_ID env vars over committing it.')
    .action((opts) => {
      const file = readConfigFile();
      file.apikey = opts.apikey; file.teamId = opts.teamid;
      if (opts.apiUrl) file.apiBaseUrl = opts.apiUrl;
      saveConfigFile(file);
      console.log('Logged in. Saved to ' + CONFIG_PATH);
      console.log('Next: `loadfocus-monitoring whoami` to verify, then `import` an existing project or author monitors/ and `deploy --dry-run`.');
    });
}
module.exports = { register };
