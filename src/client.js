// src/client.js — thin client over the /mac/* reconcile API. fetch injectable for tests.
'use strict';

const { version: CLI_VERSION } = require('../package.json');
const BASE_PATH = '/api/test/appapimonitoring/mac';

const DEFAULT_TIMEOUT_MS = 30000;

class MacClient {
  constructor(creds, fetchImpl, opts) {
    this.creds = creds || {};
    this.fetch = fetchImpl || globalThis.fetch;
    this.timeoutMs = (opts && opts.timeoutMs) || DEFAULT_TIMEOUT_MS;
  }
  _headers() {
    if (!this.creds.apikey) throw new Error('Not logged in (no apikey). Run `loadfocus-monitoring login`.');
    // apikey via loadfocus-auth; team via the `team-id` header (what the server reads). Send team-id
    // ONLY when set — omitting it lets the server use the account's default team. (Sending an empty
    // team-id is rejected as "no access to specified team".) + CLI version for drift detection.
    const h = { 'loadfocus-auth': this.creds.apikey, 'content-type': 'application/json', 'x-loadfocus-cli-version': CLI_VERSION };
    if (this.creds.teamId) h['team-id'] = this.creds.teamId;
    return h;
  }
  _req(method, pathAndQuery, body) { return this._reqPath(method, BASE_PATH + pathAndQuery, body); }
  // Same auth/timeout/error handling, but for an ABSOLUTE app path (e.g. /api/secrets/*) outside
  // the /mac reconcile base.
  async _reqPath(method, fullPath, body) {
    const url = this.creds.apiBaseUrl + fullPath;
    const opts = { method, headers: this._headers(), redirect: 'manual' };
    if (body !== undefined) opts.body = JSON.stringify(body);
    // Bound the request so a hung server can't hang CI forever.
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(this.timeoutMs);
    let res;
    try {
      res = await this.fetch(url, opts);
    } catch (e) {
      // A network-level failure (DNS, connection refused, TLS, timeout) throws an opaque
      // "fetch failed" whose real reason hides in e.cause — surface host + cause so the user can
      // actually debug it (the #1 confusing CI failure).
      const host = (() => { try { return new URL(url).host; } catch (_) { return this.creds.apiBaseUrl; } })();
      if (e && (e.name === 'TimeoutError' || e.name === 'AbortError'))
        throw new Error(`Request to ${host} timed out after ${this.timeoutMs}ms — server slow or unreachable.`);
      const cause = (e && e.cause && (e.cause.code || e.cause.message)) || (e && e.message) || 'unknown error';
      throw new Error(`Could not reach ${host} (${cause}). Check the URL / your network — set apiBaseUrl via LOADFOCUS_API_URL or \`loadfocus-monitoring config set --api-url\`.`);
    }
    // A redirect (e.g. 302 → login page) means the endpoint is auth-gating us or isn't deployed —
    // NEVER a valid /mac or /api JSON response. Treat it as an error (with redirect:'manual' the
    // 3xx surfaces here instead of fetch silently following it to an HTML page that JSON-parses to
    // {} and looks like success).
    if (res.status >= 300 && res.status < 400) {
      const host = (() => { try { return new URL(url).host; } catch (_) { return this.creds.apiBaseUrl; } })();
      const err = new Error(`Unexpected redirect from ${host} — not authenticated, or the endpoint isn't available (is the API deployed?).`);
      err.status = res.status; throw err;
    }
    let parsed; try { parsed = await res.json(); } catch (e) { parsed = {}; }
    if (!res.ok) {
      const msg = (parsed && (parsed.error || parsed.detail)) || ('HTTP ' + res.status + (res.statusText ? ' ' + res.statusText : ''));
      const err = new Error(msg); err.status = res.status; err.body = parsed; throw err;
    }
    return parsed;
  }
  getState(project) { return this._req('GET', '/state?project=' + encodeURIComponent(project)); }
  status(project, logicalIds) {
    let q = '/status?project=' + encodeURIComponent(project);
    for (const l of (logicalIds || [])) q += '&logicalId=' + encodeURIComponent(l);
    return this._req('GET', q);
  }
  deploy(payload) { return this._req('POST', '/deploy', payload); }
  test(checks) { return this._req('POST', '/test', { checks }); }
  trigger(body) { return this._req('POST', '/trigger', body); }   // {project, logicalIds?}
  // Team secrets (Azure KV) + variables (S3) — for {{secrets.X}} / {{variables.X}} in checks.
  listSecrets() { return this._reqPath('GET', '/api/secrets/list-keys'); }
  setSecret(key, value) { return this._reqPath('POST', '/api/secrets/store', { key, value }); }
  deleteSecret(key) { return this._reqPath('DELETE', '/api/secrets/delete?key=' + encodeURIComponent(key)); }
  listVariables() { return this._reqPath('GET', '/api/variables/list-keys'); }
  setVariable(key, value) { return this._reqPath('POST', '/api/variables/store', { key, value }); }
  deleteVariable(key) { return this._reqPath('DELETE', '/api/variables/delete?key=' + encodeURIComponent(key)); }
}

module.exports = { MacClient, BASE_PATH };
