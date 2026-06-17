// src/index.js — public API for authoring monitors as code in JS/TS.
// `const { Monitor, Group, AlertRule, Maintenance, Dashboard, StatusPage } = require('@loadfocus/monitoring');`
'use strict';
const constructs = require('./authoring/constructs');

module.exports = Object.assign({}, constructs);
