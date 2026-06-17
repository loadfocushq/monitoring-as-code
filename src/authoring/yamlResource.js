// src/authoring/yamlResource.js — parse a .check.yaml (single / list / multi-doc) → canonical[].
'use strict';
const yaml = require('js-yaml');

const KINDS = ['check', 'group', 'alertRule', 'maintenanceWindow', 'dashboard', 'statusPage', 'alertChannel', 'variable'];

function validateResource(r, i) {
  if (!r || typeof r !== 'object') throw new Error(`resource #${i}: not an object`);
  if (!r.kind || KINDS.indexOf(r.kind) === -1) throw new Error(`resource #${i}: missing/invalid kind (got "${r.kind}")`);
  if (!r.logicalId || typeof r.logicalId !== 'string') throw new Error(`resource #${i} (${r.kind}): missing logicalId`);
  if (r.kind === 'check' && !r.type) throw new Error(`resource #${i} (check ${r.logicalId}): missing type`);
  return r;
}

function parseYamlResources(text) {
  const docs = yaml.loadAll(text || '').filter((d) => d != null);
  const out = [];
  for (const doc of docs) {
    const items = Array.isArray(doc) ? doc : [doc];
    for (const item of items) out.push(item);
  }
  return out.map(validateResource);
}

module.exports = { parseYamlResources, KINDS };
