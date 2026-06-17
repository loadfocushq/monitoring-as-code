// src/deployFlow.js — dry-run → (confirm deletions) → apply, with planHash echo + stale-plan retry.
'use strict';

async function dryRun(client, project, payload) {
  return client.deploy({ project, dryRun: true, resources: payload });
}

async function apply(client, project, payload, planHash, deletes) {
  const body = { project, dryRun: false, resources: payload, planHash };
  if (deletes > 0) body.confirmDestroyCount = deletes;   // satisfies the server threshold gate
  return client.deploy(body);
}

// opts: { apply (bool), yes (bool — skip the deletion confirm), confirm (async (plan)=>bool) }.
async function deployFlow(client, project, payload, opts) {
  opts = opts || {};
  let dry = await dryRun(client, project, payload);
  if (!dry || !dry.plan) throw new Error('Unexpected server response to the deploy dry-run (no plan). The server may be an incompatible version.');
  if (!opts.apply) return { dryRun: true, plan: dry.plan, planHash: dry.planHash };

  const deletes = (dry.plan.deleted || []).length;
  if (deletes > 0 && !opts.yes) {
    const ok = opts.confirm ? await opts.confirm(dry.plan) : false;
    if (!ok) return { aborted: true, plan: dry.plan };
  }
  try {
    return await apply(client, project, payload, dry.planHash, deletes);
  } catch (e) {
    if (e && e.status === 409) {
      // plan changed under us (concurrent edit) — recompute once and retry with the fresh hash.
      dry = await dryRun(client, project, payload);
      if (!dry || !dry.plan) throw new Error('Unexpected server response to the deploy dry-run (no plan). The server may be an incompatible version.');
      const deletes2 = (dry.plan.deleted || []).length;
      if (deletes2 > 0 && !opts.yes) {
        const ok = opts.confirm ? await opts.confirm(dry.plan) : false;
        if (!ok) return { aborted: true, plan: dry.plan };
      }
      return apply(client, project, payload, dry.planHash, deletes2);
    }
    throw e;
  }
}

module.exports = { deployFlow };
