// Week: the week as a picture, then the selected day's log.

import * as store from '../store.js';
import { DAY_NAMES } from '../data/intake.js';
import { isoDate, weekStart, addDays, dayOfWeek, fmtShort, mean, fmtNum } from '../util.js';
import { esc, delegate, bodyText, bodyFromInput, bodyToInput } from './ui.js';

const ui = { weekOffset: 0, selected: null };
const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function renderWeek(root, ctx) {
  const d = ctx.doc, plan = d.plan, units = d.settings.units, today = isoDate();
  const free = plan.mode === 'free';
  const start = addDays(weekStart(today), ui.weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  if (!ui.selected || !days.includes(ui.selected)) ui.selected = days.includes(today) ? today : days[0];
  const sel = ui.selected, rec = store.day(sel), diet = plan.diet;
  const sessions = d.sessions.filter(s => s.completed && days.includes(s.date));
  const planned = plan.targetPerWeek ?? plan.trainingDays.length;
  const proteinDays = days.filter(x => (store.day(x).protein || 0) >= diet.proteinPortionTarget).length;
  const weights = days.map(x => store.day(x).weightKg).filter(Boolean);
  const future = sel > today;
  const dow = dayOfWeek(sel);
  const weekend = dow === 5 || dow === 6 || dow === 0;
  const isCurrent = ui.weekOffset === 0;

  root.innerHTML = `
<header class="hero floor wk">
  <div class="topbar on-floor"><span class="hero-date">${isCurrent ? 'This week' : 'Week of ' + fmtShort(start)}</span>
    <span class="wk-nav"><button class="back" data-action="prev" aria-label="Previous week">‹ Earlier</button>${isCurrent ? '' : `<button class="back" data-action="next" aria-label="Next week">Later ›</button>`}</span></div>
  <div class="wk-big"><span class="display">${sessions.length}</span><span class="wk-of">of ${planned}<br>sessions</span></div>
  <div class="wk-strip" role="tablist" aria-label="Days of the week">${days.map(x => column(x, d, plan, today, sel)).join('')}</div>
  <div class="wk-key"><i class="k tall"></i>workout <i class="k"></i>protein <i class="k"></i>water</div>
</header>

<h2 class="day-title">${DAY_NAMES[dow]}${sel === today ? ', today' : ', ' + fmtShort(sel)}</h2>
<p class="day-status">${dayStatus(sel, d, plan, today)}</p>
${future ? '' : `
<div class="log">
  ${pipRow('protein', 'Protein', `${rec.protein || 0} of ${diet.proteinPortionTarget} portions`, rec.protein || 0, diet.proteinPortionTarget)}
  ${pipRow('meals', 'Meals', `${rec.meals || 0} of ${diet.mealsTarget}`, rec.meals || 0, diet.mealsTarget)}
  <div class="logrow"><div class="logl"><b>Water</b><span>${diet.waterL} litres or more</span></div><button class="pip big ${rec.water ? 'on' : ''}" data-action="water" aria-pressed="${!!rec.water}" aria-label="Water target hit">${rec.water ? '✓' : ''}</button></div>
  ${(weekend && diet.alcoholRule) || rec.beers ? pipRow('beers', 'Beers', rec.beers ? `${rec.beers}${rec.beers > 2 ? ', over the two' : ''}` : 'none', rec.beers || 0, 2, 6) : ''}
  <div class="logrow"><div class="logl"><b>Sleep</b><span>hours, roughly</span></div><div class="stepper slim"><button data-action="sleep" data-dir="down" aria-label="Less sleep">−</button><output>${rec.sleep ?? '–'}</output><button data-action="sleep" data-dir="up" aria-label="More sleep">+</button></div></div>
  <div class="logrow"><div class="logl"><b>Morning weight</b><span>${units.body}, after the bathroom</span></div><input class="input num" type="number" inputmode="decimal" step="0.1" value="${bodyToInput(rec.weightKg, units)}" data-change="weight" aria-label="Weight"></div>
  ${dow === 0 || rec.waistCm ? `<div class="logrow"><div class="logl"><b>Waist</b><span>at the navel, relaxed, ${units.body === 'lb' ? 'inches' : 'cm'}</span></div><input class="input num" type="number" inputmode="decimal" step="0.1" value="${waistToInput(rec.waistCm, units)}" data-change="waist" aria-label="Waist"></div>` : ''}
  <div class="logrow col"><div class="logl"><b>Note</b></div><input class="input" type="text" value="${esc(rec.note || '')}" placeholder="Anything worth remembering" data-change="note" aria-label="Note for the day"></div>
</div>`}

<h2 class="h2">This week</h2>
<div class="stats">
  <div><b>${sessions.length}<span class="of">/${planned}</span></b><span>workouts</span></div>
  <div><b>${proteinDays}<span class="of">/7</span></b><span>protein days</span></div>
  <div><b>${weights.length ? bodyText(mean(weights), units).replace(/ (kg|lb)$/, '') : '–'}</b><span>avg ${units.body}${weights.length ? `, ${weights.length} mornings` : ''}</span></div>
</div>
${allTime(d, plan, today)}`;

  delegate(root, {
    prev: () => { ui.weekOffset--; ui.selected = null; renderWeek(root, ctx); },
    next: () => { ui.weekOffset = Math.min(0, ui.weekOffset + 1); ui.selected = null; renderWeek(root, ctx); },
    pick: el => { ui.selected = el.dataset.date; renderWeek(root, ctx); },
    pip: el => { const { key, n } = el.dataset; const cur = store.day(sel)[key] || 0; const v = Number(n); store.setDay(sel, { [key]: v === cur ? v - 1 : v }); },
    water: () => store.setDay(sel, { water: !store.day(sel).water }),
    sleep: el => { const cur = store.day(sel).sleep ?? 7; store.setDay(sel, { sleep: Math.max(0, Math.min(14, cur + (el.dataset.dir === 'up' ? 0.5 : -0.5))) }); },
  });
  const bind = (name, fn) => root.querySelectorAll(`[data-change="${name}"]`).forEach(i => i.onchange = () => fn(i.value));
  bind('weight', v => store.setDay(sel, { weightKg: bodyFromInput(v, units) }));
  bind('waist', v => store.setDay(sel, { waistCm: v === '' ? null : (units.body === 'lb' ? Number(v) * 2.54 : Number(v)) }));
  bind('note', v => store.setDay(sel, { note: v.trim() || null }));
}

// A row of tappable pips. Tap the n-th to set the count to n; tap the last
// filled one to step back. `max` allows going past the target (beers).
function pipRow(key, label, sub, val, target, max = target) {
  return `<div class="logrow"><div class="logl"><b>${esc(label)}</b><span>${esc(sub)}</span></div>
  <div class="pips" role="group" aria-label="${esc(label)}">${Array.from({ length: Math.max(max, val) }, (_, i) => i + 1).map(n => `<button class="pip ${n <= val ? 'on' : ''} ${n > target ? 'over' : ''}" data-action="pip" data-key="${key}" data-n="${n}" aria-pressed="${n <= val}" aria-label="${esc(label)} ${n}"></button>`).join('')}</div></div>`;
}

function waistToInput(cm, units) { if (cm == null) return ''; return units.body === 'lb' ? fmtNum(cm / 2.54, 1) : fmtNum(cm, 1); }

// One column of the week strip: a tall block for the workout, two small ones
// for protein and water. Filled when done, outlined in rust when a planned
// lifting day was missed.
function column(iso, d, plan, today, sel) {
  const dow = dayOfWeek(iso), rec = store.day(iso);
  const lifted = d.sessions.find(s => s.completed && s.date === iso);
  const plannedLift = plan.mode !== 'free' && plan.trainingDays.includes(dow) && iso >= plan.createdAt;
  const missed = plannedLift && !lifted && iso < today && iso >= plan.createdAt;
  const protein = (rec.protein || 0) >= plan.diet.proteinPortionTarget;
  const future = iso > today;
  return `<button role="tab" class="wk-col ${iso === sel ? 'sel' : ''} ${iso === today ? 'today' : ''} ${future ? 'future' : ''}" aria-pressed="${iso === sel}" data-action="pick" data-date="${iso}" aria-label="${DAY_NAMES[dow]} ${iso.slice(8)}">
    <span class="wk-d">${DAY_LETTER[dow]}</span>
    <span class="blk tall ${lifted ? 'on' : ''} ${missed ? 'miss' : ''} ${plannedLift && !lifted && !missed ? 'plan' : ''}">${lifted && lifted.source !== 'free' ? esc(lifted.workoutId) : ''}</span>
    <span class="blk ${protein ? 'on' : ''}"></span>
    <span class="blk ${rec.water ? 'on' : ''}"></span>
    <span class="wk-n">${Number(iso.slice(8))}</span>
  </button>`;
}

function dayStatus(iso, d, plan, today) {
  const s = d.sessions.find(x => x.completed && x.date === iso);
  const dow = dayOfWeek(iso);
  if (s) { const sets = Object.values(s.items).reduce((a, it) => a + it.sets.filter(x => x.done).length, 0); const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : null;
    return `${s.source === 'free' ? 'Workout done' : `Workout ${esc(s.workoutId)} done`}: ${sets} sets${mins ? ` in ${mins} minutes` : ''}${s.source === 'fallback' ? ', no-equipment version' : ''}.`; }
  if (iso > today) return 'Not yet.';
  if (plan.mode === 'free') return iso === today ? 'No workout logged yet. Start one from Today.' : 'No workout logged.';
  if (plan.trainingDays.includes(dow)) { if (iso < plan.createdAt) return 'Before you started.'; return iso < today ? 'Lifting day, not done. Nothing to make up; the rotation just continues.' : 'Lifting day. Not done yet.'; }
  if (plan.cardioDays.includes(dow)) return store.day(iso).cardio ? 'Easy cardio done.' : 'Easy cardio day, optional. Tick it on Today when done.';
  return 'Rest day. Eat to target, sleep.';
}

function allTime(d, plan, today) {
  const first = plan.createdAt; const w0 = weekStart(first), wNow = weekStart(today);
  const weeks = []; for (let w = w0; w < wNow; w = addDays(w, 7)) weeks.push(w);
  if (!weeks.length) return '';
  const target = plan.targetPerWeek ?? plan.trainingDays.length;
  const hit = weeks.filter(w => d.sessions.filter(s => s.completed && s.date >= w && s.date < addDays(w, 7)).length >= target).length;
  return `<h2 class="h2">Since you started</h2>
<div class="stats">
  <div><b>${hit}<span class="of">/${weeks.length}</span></b><span>weeks on target</span></div>
  <div><b>${d.sessions.filter(s => s.completed).length}</b><span>workouts</span></div>
</div>
<p class="small muted" style="margin-top:12px">No streaks here. A bad week does not erase the good ones.</p>`;
}
