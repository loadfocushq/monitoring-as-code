// src/commands/env.js — manage team secrets ({{secrets.X}}) and variables ({{variables.X}}) that
// checks reference. Secrets live in the team's vault; this never PRINTS a secret value (only keys),
// and accepts a secret value via stdin so it doesn't land in shell history.
'use strict';
const { resolveCredentials, readConfigFile } = require('../credentials');
const { MacClient } = require('../client');
const { withJson, emit } = require('../output');

function client() { return new MacClient(resolveCredentials(process.env, readConfigFile())); }

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => { data += c; });
    process.stdin.on('end', () => resolve(data.replace(/\r?\n$/, '')));
  });
}

async function resolveValue(value) {
  if (value !== undefined) return value;
  if (process.stdin.isTTY) {   // no pipe → don't hang waiting on stdin
    console.error('Pass the value as an argument or pipe it via stdin, e.g.  printf %s "$VAL" | loadfocus-monitoring env set-secret KEY');
    process.exit(1);
  }
  return readStdin();
}

function register(program) {
  const env = program.command('env').description('Manage team secrets ({{secrets.X}}) and variables ({{variables.X}})');

  const ls = env.command('ls').description('List secret + variable KEYS (values are never shown)');
  withJson(ls);
  ls.action(async (opts) => {
    const c = client();
    // Let auth/network errors propagate (→ clear error + exit 1). Swallowing them into an empty
    // list would make a 401/outage look like "you have no secrets" — dangerous for a secrets cmd.
    const [s, v] = await Promise.all([c.listSecrets(), c.listVariables()]);
    // list-keys entries may be plain strings OR {key,value} objects (variables) — normalize to the
    // key NAME and drop blank rows. (Values aren't shown here even if the server returns them.)
    const keyName = (k) => (typeof k === 'string' ? k : (k && (k.key || k.name))) || '';
    const secrets = ((s && s.keys) || []).map(keyName).filter(Boolean);
    const variables = ((v && v.keys) || []).map(keyName).filter(Boolean);
    emit(opts, { secrets, variables }, () => {
      console.log(`secrets (${secrets.length}):`); secrets.forEach((k) => console.log('  ' + k));
      console.log(`variables (${variables.length}):`); variables.forEach((k) => console.log('  ' + k));
    });
  });

  const setSecret = env.command('set-secret <key> [value]').description('Store a secret (value from arg or stdin — pipe it to keep it out of shell history)');
  withJson(setSecret);
  setSecret.action(async (key, value, opts) => {
    const v = await resolveValue(value);
    if (!v) { console.error('Empty value.'); process.exit(1); }
    await client().setSecret(key, v);
    emit(opts, { ok: true, kind: 'secret', key }, `Stored secret "${key}".`);
  });

  const setVar = env.command('set-var <key> [value]').description('Store a variable (value from arg or stdin)');
  withJson(setVar);
  setVar.action(async (key, value, opts) => {
    const v = await resolveValue(value);
    if (!v) { console.error('Empty value.'); process.exit(1); }
    await client().setVariable(key, v);
    emit(opts, { ok: true, kind: 'variable', key }, `Stored variable "${key}".`);
  });

  const rmSecret = env.command('rm-secret <key>').description('Delete a secret');
  withJson(rmSecret);
  rmSecret.action(async (key, opts) => { await client().deleteSecret(key); emit(opts, { ok: true, kind: 'secret', key }, `Deleted secret "${key}".`); });

  const rmVar = env.command('rm-var <key>').description('Delete a variable');
  withJson(rmVar);
  rmVar.action(async (key, opts) => { await client().deleteVariable(key); emit(opts, { ok: true, kind: 'variable', key }, `Deleted variable "${key}".`); });
}
module.exports = { register, resolveValue };
