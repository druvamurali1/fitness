// One exercise, explained: what it is, where it is in your gym, a video, the
// setup, the movement, what it should feel like, the usual mistakes, and what
// the plan asks of you.

import { HOWTO, setsText } from '../data/howto.js';
import { VIDEOS } from '../data/videos.js';
import { EXERCISES } from '../data/exercises.js';
import * as store from '../store.js';
import { esc, delegate } from './ui.js';
import { startText, loadShort } from './words.js';
import { fmtNum, fmtShort, fmtDate, displayLoad, isoDate, addDays } from '../util.js';
import { lineChart, bindCharts } from '../charts.js';
import { loadText } from './ui.js';

const CHEV = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function renderExercise(root, ctx, id) {
  const d = ctx.doc, plan = d.plan, units = d.settings.units;
  const ex = EXERCISES[id], how = HOWTO[id];
  if (!ex || !how) { root.innerHTML = `<p class="empty">No exercise called "${esc(id)}".</p><p><a href="#today">Back to today</a></p>`; return; }
  const inPlan = [...plan.workouts, ...plan.fallback].flatMap(w => w.exercises.map(e => ({ ...e, workout: w }))).find(e => e.exerciseId === id);
  const key = how.where;
  const where = d.profile?.equipmentNotes?.[key] || plan.equipmentNotes?.[key] || null;
  const photo = d.equipmentPhotos?.[key] || null;
  const v = VIDEOS[id];
  const editing = ui.editing === key;
  if (ui.id !== id) { ui.id = id; ui.tab = 'summary'; ui.editing = null; }
  const loaded = !['body', 'time'].includes(ex.loadType);
  const hist = store.exerciseHistory(id).filter(h => h.sets.some(x => x.done && x.reps > 0));
  const tabs = [['summary', 'Summary'], ['history', 'History'], ['howto', 'How to']];
  root.innerHTML = `
<div class="pbar">
  <div class="pbar-top"><button class="pbar-back" data-action="back" aria-label="Back">${CHEV}</button><span class="pbar-title">${esc(ex.name)}</span><span></span></div>
  <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${ui.tab === k}" data-action="tab" data-tab="${k}">${l}</button>`).join('')}</div>
</div>
${ui.tab === 'summary' ? (v ? video(v) : '') + summaryTab(ex, id, inPlan, hist, loaded, units) : ui.tab === 'history' ? historyTab(ex, hist, loaded, units) : `
${v ? video(v) : ''}
<p class="lede" style="margin-top:14px">${esc(how.what)}</p>
${inPlan ? `<p class="small muted">In workout ${esc(inPlan.workout.id)}: ${esc(setsText(inPlan))}. ${esc(startText(inPlan, units))}</p>` : ''}

<h2 class="h3">Where it is in your gym</h2>
${photo ? `<img class="gym-photo" src="${photo}" alt="Your photo of this equipment">` : ''}
${editing ? `<div class="field" style="margin-top:6px"><label for="wherenote">Describe it so you find it next time</label><textarea class="input" id="wherenote" maxlength="300" data-field="where" placeholder="${esc(equipmentFallback(key))} For example: the grey machine by the stairs, second from the left.">${esc(d.profile?.equipmentNotes?.[key] || '')}</textarea></div>
<div class="actions inline" style="margin-top:0"><button class="btn small" data-action="save_where">Save</button><label class="btn quiet small" style="cursor:pointer">${photo ? 'Replace photo' : 'Add a photo'}<input type="file" accept="image/*" capture="environment" hidden data-change="gymphoto"></label>${photo ? `<button class="link" data-action="del_photo">Remove photo</button>` : ''}<button class="link" data-action="cancel_where">Cancel</button></div>`
: `<p>${esc(where || equipmentFallback(key))}</p><button class="link" data-action="edit_where">${where && d.profile?.equipmentNotes?.[key] ? 'Edit this note or photo' : 'Add a note or a photo of where it is'}</button>`}

${inPlan && inPlan.alts && inPlan.alts.length ? `<h2 class="h3">If it's taken, or your gym doesn't have it</h2>
<p class="small muted" style="margin-top:-2px">Same movement, different tool, in the order to try them. Weights do not carry over. In a session, ⋮ then Swap exercise does this in one tap.</p>
<ul class="rows tight">${inPlan.alts.map((a, i) => `<li class="row"><a class="row-head link-row" style="grid-template-columns:34px 1fr auto" href="#exercise/${a.id}"><span class="tag">${i + 1}</span><span class="row-title">${esc(a.name)}</span><span class="row-meta chev" aria-hidden="true">▸</span></a></li>`).join('')}</ul>` : ''}

<h2 class="h3">Set it up</h2>
<ol class="steps-list">${how.setup.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
<h2 class="h3">Do it</h2>
<ol class="steps-list">${how.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
<div class="twocol">
  <div><b>It should feel like</b><p style="margin-top:4px">${esc(how.feel)}</p></div>
  <div><b>Watch out for</b><ul class="cues">${how.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div>
<details class="fold"><summary>Short cues to remember</summary><ul class="cues">${ex.cues.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>`}`;

  delegate(root, {
    back: () => { if (history.length > 1) history.back(); else location.hash = '#today'; },
    tab: el => { ui.tab = el.dataset.tab; renderExercise(root, ctx, id); window.scrollTo(0, 0); },
    metric: el => { ui.metric = el.dataset.m; renderExercise(root, ctx, id); },
    range: el => { ui.range = el.dataset.r; renderExercise(root, ctx, id); },
    edit_where: () => { ui.editing = key; renderExercise(root, ctx, id); },
    cancel_where: () => { ui.editing = null; renderExercise(root, ctx, id); },
    save_where: () => { const text = root.querySelector('[data-field="where"]').value.trim().slice(0, 300); ui.editing = null; store.update(x => { x.profile ||= {}; x.profile.equipmentNotes ||= {}; if (text) x.profile.equipmentNotes[key] = text; else delete x.profile.equipmentNotes[key]; }); },
    del_photo: () => { store.update(x => { if (x.equipmentPhotos) delete x.equipmentPhotos[key]; }); },
    play: el => { const wrap = el.closest('.video'); wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`; },
  });
  bindCharts(root);
  const inp = root.querySelector('[data-change="gymphoto"]');
  if (inp) inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const dataUrl = await shrink(f, 720); ui.editing = null; store.update(x => { x.equipmentPhotos ||= {}; x.equipmentPhotos[key] = dataUrl; }); };
}

const ui = { editing: null, id: null, tab: 'summary', metric: null, range: 'all' };

// ── Summary: muscles, the headline number, the chart, records ──
const e1rm = (w, r) => r === 1 ? w : w * (1 + r / 30);
function sessionMetrics(h) {
  const sets = h.sets.filter(x => x.done && x.reps > 0);
  const w = x => x.w ?? h.weightLb ?? 0;
  const top = sets.reduce((a, x) => (!a || w(x) * 1000 + x.reps > w(a) * 1000 + a.reps) ? x : a, null);
  return {
    heaviest: Math.max(...sets.map(w)),
    orm: Math.max(...sets.map(x => e1rm(w(x), x.reps))),
    volume: Math.max(...sets.map(x => w(x) * x.reps)),
    reps: Math.max(...sets.map(x => x.reps)),
    total: sets.reduce((a, x) => a + x.reps, 0),
    best: top ? { w: w(top), reps: top.reps } : null,
  };
}

function summaryTab(ex, id, inPlan, hist, loaded, units) {
  const metrics = loaded ? [['heaviest', 'Heaviest weight'], ['orm', 'One rep max'], ['volume', 'Best set volume']] : [['reps', ex.loadType === 'time' ? 'Longest hold' : 'Most reps'], ['total', ex.loadType === 'time' ? 'Total seconds' : 'Total reps']];
  if (!ui.metric || !metrics.some(([k]) => k === ui.metric)) ui.metric = metrics[0][0];
  const cutoff = ui.range === 'all' ? '' : addDays(isoDate(), ui.range === '1m' ? -30 : -91);
  const rows = hist.filter(h => h.date >= cutoff).map(h => ({ date: h.date, m: sessionMetrics(h) }));
  const isLoad = ['heaviest', 'orm', 'volume'].includes(ui.metric);
  const val = v => isLoad ? displayLoad(v, units.load, ui.metric === 'volume' ? 'free' : ex.loadType) : v;
  const unit = isLoad ? units.load : ex.loadType === 'time' ? 's' : 'reps';
  const pts = rows.map(r => ({ date: r.date, y: Math.round(val(r.m[ui.metric]) * 10) / 10 }));
  const last = pts[pts.length - 1];
  const all = hist.map(h => ({ date: h.date, m: sessionMetrics(h) }));
  const bestOf = k => all.reduce((a, r) => (!a || r.m[k] > a.m[k]) ? r : a, null);
  const shown = lb => `${fmtNum(displayLoad(lb, units.load, ex.loadType), 1)} ${units.load}`;
  const prs = !all.length ? [] : loaded ? [
    ['Heaviest weight', shown(bestOf('heaviest').m.heaviest), bestOf('heaviest').date],
    ['Best one rep max, estimated', shown(bestOf('orm').m.orm), bestOf('orm').date],
    ['Best set', (() => { const b = bestOf('orm'); return `${shown(b.m.best.w)} × ${b.m.best.reps}`; })(), bestOf('orm').date],
    ['Best set volume', `${fmtNum(displayLoad(bestOf('volume').m.volume, units.load, 'free'))} ${units.load}`, bestOf('volume').date],
  ] : [
    [ex.loadType === 'time' ? 'Longest hold' : 'Most reps in a set', `${bestOf('reps').m.reps}${ex.loadType === 'time' ? ' s' : ''}`, bestOf('reps').date],
    [ex.loadType === 'time' ? 'Most seconds in a session' : 'Most reps in a session', `${bestOf('total').m.total}`, bestOf('total').date],
  ];
  return `
<h2 class="ex-name">${esc(ex.name)}</h2>
<p class="small muted" style="margin:2px 0 0">Primary: ${esc(ex.muscles.primary.join(', '))}${ex.muscles.secondary.length ? `. Also: ${esc(ex.muscles.secondary.join(', '))}` : ''}</p>
${inPlan ? `<p class="small" style="margin:6px 0 0">In workout ${esc(inPlan.workout.id)}: ${esc(setsText(inPlan))}. ${esc(startText(inPlan, units))}</p>` : ''}
${hist.length ? `
${pts.length ? lineChart(pts, { unit, id: 'ex', right: `<span class="seg small-seg">${[['1m', '1M'], ['3m', '3M'], ['all', 'All']].map(([k, l]) => `<button aria-pressed="${ui.range === k}" data-action="range" data-r="${k}">${l}</button>`).join('')}</span>` }) : `<div class="chart-read"><div><b>–</b><span>Nothing in this range</span></div><span class="seg small-seg">${[['1m', '1M'], ['3m', '3M'], ['all', 'All']].map(([k, l]) => `<button aria-pressed="${ui.range === k}" data-action="range" data-r="${k}">${l}</button>`).join('')}</span></div>`}
<div class="chips">${metrics.map(([k, l]) => `<button class="chip ${ui.metric === k ? 'on' : ''}" data-action="metric" data-m="${k}">${l}</button>`).join('')}</div>
<h3 class="h3">Personal records</h3>
<ul class="cmp">${prs.map(([k, v, dt]) => `<li><span>${esc(k)}</span><span class="muted">${fmtShort(dt)}</span><span><b>${esc(v)}</b></span></li>`).join('')}</ul>`
: `<p class="empty" style="margin-top:16px">Log this exercise once and your chart and records start here.</p>`}`;
}

function historyTab(ex, hist, loaded, units) {
  if (!hist.length) return `<p class="empty" style="margin-top:16px">No sessions with this exercise yet.</p>`;
  return hist.slice().reverse().map(h => `<section class="hist">
    <div class="hist-h"><b>${fmtDate(h.date, { weekday: 'long', day: 'numeric', month: 'short' })}</b>${h.note ? `<span class="small muted">“${esc(h.note)}”</span>` : ''}</div>
    <ul class="hist-sets">${h.sets.filter(x => x.done && x.reps > 0).map((x, i) => `<li><span class="st-n">${i + 1}</span><span>${loaded && (x.w ?? h.weightLb) ? `${fmtNum(displayLoad(x.w ?? h.weightLb, units.load, ex.loadType), 1)} ${units.load} × ` : ''}${x.reps}${ex.loadType === 'time' ? ' s' : ' reps'}</span></li>`).join('')}</ul>
  </section>`).join('');
}

function shrink(file, max) {
  return new Promise(res => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); URL.revokeObjectURL(img.src); }; img.src = URL.createObjectURL(file); });
}

// The video is a poster image until tapped, so nothing loads from YouTube
// until you ask for it. Tapping swaps in the player.
function video(v) {
  return `<div class="video"><button type="button" class="video-poster" data-action="play" aria-label="Play video: ${esc(v.title)}">
    <img src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/hqdefault.jpg" alt="" loading="lazy">
    <span class="play"><svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
  </button><div class="video-cap small muted">${esc(v.title)}. ${esc(v.channel)} on YouTube. Needs internet.</div></div>`;
}

function equipmentFallback(key) {
  return { barbell: 'The barbell in the squat rack. Look for the tall frame with the long bar resting on hooks.', dumbbells: 'The dumbbell rack, usually along a mirror.', bench: 'An adjustable bench. The back tilts and locks at a few angles.', cables: 'The cable machine: a tall frame with a weight stack and a pulley you can slide up and down.', machines: 'The weight machines with a pin you push into a stack. Each has a label with the exercise name.', pullup_bar: 'A pull-up bar, often across the top of the squat rack.', leg_press: 'The leg press: a seat that reclines with a big platform for your feet.', none: 'Anywhere with a bit of floor.' }[key] || '';
}
