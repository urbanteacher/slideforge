/*
 * A lesson plan: an ordered run of activities with a time budget.
 *
 * The third document kind, beside a deck and a game. It holds no content of
 * its own — only which activities were chosen and in what order — because the
 * content belongs to whatever the activity builds. Compiling a plan produces
 * deck slides and games, the same way compiling a game produces slides.
 *
 * Deliberately thin. A plan that also stored the questions would be a second
 * place for them to live and a second place for them to drift.
 */
import { uid } from "../core/identity.js";
import { activity } from "./catalogue.js";

/**
 * @typedef {import("../types.js").Plan} Plan
 * @typedef {import("../types.js").PlanItem} PlanItem
 * @typedef {import("../types.js").PhaseKey} PhaseKey
 */

/**
 * @param {string} [title]
 * @returns {Plan}
 */
function makePlan(title) {
  /** @type {Plan} */
  var plan = {
    id: uid(),
    kind: 'plan',
    title: title || 'Untitled lesson plan',
    theme: 'studio',
    created: Date.now(),
    modified: Date.now(),
    items: []
  };
  return plan;
}

/**
 * A plan from storage, made safe to open.
 *
 * `raw` is `any` for the same reason the other normalizers take it: whatever
 * is on disk. An item naming an activity this build no longer offers is
 * dropped rather than kept as a hole the rail has to render around.
 *
 * @param {any} raw
 * @returns {Plan | null}
 */
function normalizePlan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  /** @type {Plan} */
  var plan = Object.assign(makePlan(), raw);
  plan.id = plan.id || uid();
  plan.kind = 'plan';
  plan.title = String(plan.title || 'Untitled lesson plan');
  plan.items = (Array.isArray(raw.items) ? raw.items : [])
    .map(function (item) {
      var key = String((item && item.key) || '');
      return activity(key) ? { id: (item && item.id) || uid(), key: key } : null;
    })
    .filter(Boolean);
  return plan;
}

/** Minutes the plan asks for, as a planning estimate. */
function planMinutes(plan) {
  return (plan.items || []).reduce(function (sum, item) {
    var a = activity(item.key);
    return sum + ((a && a.minutes) || 0);
  }, 0);
}

/**
 * The plan's items grouped under the phases they belong to, in phase order,
 * skipping phases the plan does not use. This is what the rail draws.
 *
 * @param {Plan} plan
 * @param {{key: PhaseKey, label: string, icon: string}[]} phases
 */
function planByPhase(plan, phases) {
  return phases
    .map(function (phase) {
      var items = (plan.items || []).filter(function (item) {
        var a = activity(item.key);
        return a && a.phase === phase.key;
      });
      return { phase: phase, items: items };
    })
    .filter(function (group) { return group.items.length; });
}

/** One line describing a plan, for the Open dialog's list. */
function describePlan(plan) {
  var n = (plan.items || []).length;
  var mins = planMinutes(plan);
  return n + (n === 1 ? ' activity' : ' activities') +
    (mins ? ' · about ' + mins + ' min' : '') +
    ' · ' + new Date(plan.modified).toLocaleString();
}

export { makePlan, normalizePlan, planMinutes, planByPhase, describePlan };
