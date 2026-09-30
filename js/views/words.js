// Plain-language versions of plan notation. Used by Today, Plan and the
// exercise page so the wording is identical everywhere.

import { displayLoad, fmtNum } from '../util.js';

const BAR_LB = 45;

export function startText(e, units) {
  if (e.startLoadLb == null) return e.measure === 'seconds' ? 'Just you and a clock.' : 'Just your bodyweight.';
  const shown = fmtNum(displayLoad(e.startLoadLb, units.load, e.loadType), 1) + ' ' + units.load;
  if (e.loadType === 'barbell') return e.startLoadLb <= BAR_LB ? `Start with the empty bar (${shown}).` : `Start with ${shown} on the bar, counting the bar.`;
  if (e.loadType === 'dumbbell') return `Start with ${shown} in each hand.`;
  if (e.loadType === 'stack') return `Put the pin at ${shown}.`;
  return `Start at ${shown}.`;
}

export function loadShort(lb, units, loadType) {
  if (lb == null) return '';
  const shown = fmtNum(displayLoad(lb, units.load, loadType), 1) + ' ' + units.load;
  if (loadType === 'barbell' && lb <= BAR_LB) return 'empty bar';
  if (loadType === 'dumbbell') return shown + ' each';
  if (loadType === 'stack') return 'pin ' + shown;
  return shown;
}
