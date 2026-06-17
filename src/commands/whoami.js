// src/commands/whoami.js — confirm creds work via a lightweight authenticated call.
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { MacClient } = require('../client');
const { withJson, emit } = require('../output');
function register(program) {
  const cmd = program.command('whoami').description('Verify credentials against the server');
  withJson(cmd);
  cmd.action(async (opts) => {
    const creds = resolveCredentials(process.env, readConfigFile());
    if (!creds.apikey) {
      if (!emit(opts, { ok: false, error: 'not-logged-in' })) console.error('Not logged in. Run `loadfocus-monitoring login`.');
      process.exit(1);
    }
    const client = new MacClient(creds);
    // Reading the reserved (unmanaged) namespace is a legal, zero-setup auth probe (only deploy
    // rejects it). A 200 confirms apikey + team are valid for this service.
    await client.getState('(unmanaged)');
    emit(opts, { ok: true, apiBaseUrl: creds.apiBaseUrl, teamId: creds.teamId || null }, () => {
      console.log(`OK — authenticated to ${creds.apiBaseUrl} (team ${creds.teamId || '—'})`);
      console.log('Next: `import --project <name>` to adopt existing monitors, or author monitors/ and `deploy --dry-run`.');
    });
  });
}
module.exports = { register };
