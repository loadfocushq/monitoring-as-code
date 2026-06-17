// src/credentials.js — resolve apikey/teamId/apiBaseUrl from env (highest) then the config file.
'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR = path.join(os.homedir(), '.loadfocus');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const DEFAULT_BASE_URL = 'https://apimonitor.loadfocus.com';

function readConfigFile() {
  try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); } catch (e) { return {}; }
}
function saveConfigFile(obj) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  // mkdir's `mode` is ignored for a PRE-EXISTING dir — re-assert 0700 so the apikey isn't left in
  // a group/other-traversable dir. Best-effort (non-POSIX fs). (security re-audit L1)
  try { fs.chmodSync(CONFIG_DIR, 0o700); } catch (e) { /* best-effort */ }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(obj, null, 2), { mode: 0o600 });
  // `mode` on writeFileSync only applies when the file is CREATED — a pre-existing config left
  // at a looser mode (e.g. 0644) would keep the apikey world-readable. Re-assert 0600 always.
  try { fs.chmodSync(CONFIG_PATH, 0o600); } catch (e) { /* best-effort (e.g. non-POSIX fs) */ }
}

// The apikey is sent as a header to apiBaseUrl, so validate it before we hand the key over:
// refuse non-http(s) schemes, refuse cleartext http to a non-loopback host (leaks the key), and
// WARN (don't block — supports private/self-hosted) when the host isn't *.loadfocus.com. Returns
// the url unchanged when acceptable; throws on a clearly unsafe one.
function assertSafeBaseUrl(apiBaseUrl) {
  let u;
  try { u = new URL(apiBaseUrl); } catch (e) { throw new Error(`invalid apiBaseUrl: ${JSON.stringify(apiBaseUrl)}`); }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error(`apiBaseUrl must be http(s): ${apiBaseUrl}`);
  const loopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '::1';
  if (u.protocol === 'http:' && !loopback) throw new Error(`refusing to send the apikey over cleartext http to ${u.hostname} — use https`);
  if (!loopback && u.hostname !== 'loadfocus.com' && !u.hostname.endsWith('.loadfocus.com'))
    console.error(`WARNING: sending your LoadFocus apikey to a non-loadfocus.com host: ${u.hostname}`);
  return apiBaseUrl;
}

// Pure: env object + file object → resolved creds. (callers pass process.env + readConfigFile()).
function resolveCredentials(env, file) {
  env = env || {}; file = file || {};
  const apiBaseUrl = env.LOADFOCUS_API_URL || file.apiBaseUrl || DEFAULT_BASE_URL;
  assertSafeBaseUrl(apiBaseUrl);
  return {
    apikey: env.LOADFOCUS_API_KEY || file.apikey || null,
    teamId: env.LOADFOCUS_TEAM_ID || file.teamId || null,
    apiBaseUrl,
  };
}

module.exports = { resolveCredentials, readConfigFile, saveConfigFile, assertSafeBaseUrl, CONFIG_PATH, DEFAULT_BASE_URL };
