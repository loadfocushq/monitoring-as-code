// src/authoring/loadResources.js — glob the project's check files + parse each → canonical[].
'use strict';
const fs = require('fs');
const fg = require('fast-glob');
const { parseYamlResources } = require('./yamlResource');

// A .js authoring file exports an array of construct instances (with .toCanonical()) OR plain
// canonical objects. Normalize both to canonical[].
function fromJsModule(mod) {
  const arr = Array.isArray(mod) ? mod : (mod && mod.default ? (Array.isArray(mod.default) ? mod.default : [mod.default]) : [mod]);
  return arr.map((x) => (x && typeof x.toCanonical === 'function') ? x.toCanonical() : x);
}

async function loadResources(cwd, checkMatch) {
  const entries = await fg(checkMatch, { cwd, absolute: true, ignore: ['**/node_modules/**', '**/.git/**'] });
  const out = [];
  for (const file of entries.sort()) {
    // Prefix any parse/require/validation failure with the offending file — with many monitor
    // files an unqualified "Duplicate logicalId" / YAML error is hard to locate.
    try {
      if (file.endsWith('.js')) {
        out.push(...fromJsModule(require(file)));
      } else {
        out.push(...parseYamlResources(fs.readFileSync(file, 'utf8')));
      }
    } catch (e) {
      throw new Error(`${file}: ${e.message}`);
    }
  }
  return out;
}

module.exports = { loadResources, fromJsModule };
