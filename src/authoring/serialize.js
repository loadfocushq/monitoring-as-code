// src/authoring/serialize.js — canonical resource → YAML file (for `import`). Defensively strips
// server-only fields so an imported file is clean, deployable authoring (the server also strips,
// but state output shouldn't carry them anyway). Uses js-yaml dump (no code-exec; load is safe in v4).
'use strict';
const yaml = require('js-yaml');

const SERVER_ONLY = ['id', 'team_id', 'uniqueid', 'managed', 'project', 'requesttime', 'checktime', 'createdAt', 'updatedAt'];
const KINDS = ['check', 'group', 'alertRule', 'maintenanceWindow', 'dashboard', 'statusPage', 'alertChannel', 'variable'];

function serializeResource(resource) {
  const clean = Object.assign({}, resource);
  for (const k of SERVER_ONLY) delete clean[k];
  return yaml.dump(clean, { lineWidth: 120, noRefs: true, sortKeys: false });
}

// SECURITY: the server response is only semi-trusted — a malicious/buggy/MITM'd server could
// return a `logicalId` like "../../etc/evil" or "/abs/pwn" that path.join would resolve OUTSIDE
// the import dir, overwriting arbitrary files. Reject any logicalId/kind containing a path
// separator, "..", or NUL, and validate kind against the known set, before it ever reaches a
// filename.
function importFilename(resource) {
  const lid = resource && resource.logicalId;
  const kind = resource && resource.kind;
  if (!lid || typeof lid !== 'string' || /[\/\\\0]/.test(lid) || lid === '..' || lid.includes('..'))
    throw new Error(`unsafe logicalId from server: ${JSON.stringify(lid)}`);
  if (!KINDS.includes(kind))
    throw new Error(`unknown resource kind from server: ${JSON.stringify(kind)}`);
  return `${lid}.${kind}.yaml`;
}

module.exports = { serializeResource, importFilename, SERVER_ONLY, KINDS };
