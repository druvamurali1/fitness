// Progress: the main lifts over time, bodyweight, waist, photos, and the
// one-month comparison.

import * as store from '../store.js';
import { lineChart } from '../charts.js';
import { isoDate, weekStart, addDays, mean, fmtShort, fmtNum, displayLoad, kgToLb, e1rm } from '../util.js';
import { esc, delegate, bodyText, loadText, pageBar } from './ui.js';
import { EXERCISES } from '../data/exercises.js';
import { bestSet } from '../generator.js';

const ui = { lift: null, measure: 'waistCm' };
const MEASURES = [['waistCm', 'Waist'], ['chestCm', 'Chest'], ['armCm', 'Upper arm'], ['thighCm', 'Thigh'], ['hipsCm', 'Hips']];

export function renderProgress(root, ctx) {
  const d = ctx.doc, plan = d.plan, units = d.settings.units, today = isoDate();
  let lifts = plan.workouts.flatMap(w => w.exercises).filter((e, i, arr) => arr.findIndex(x => x.exerciseId === e.exerciseId) === i);
  if (plan.mode === 'free') {
    const counts = {};
    d.sessions.filter(s => s.completed).forEach(s => Object.keys(s.items).forEach(id => { counts[id] = (counts[id] || 0) + 1; }));
    lifts = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map(id => { const ex = EXERCISES[id]; return { exerciseId: id, name: ex?.name || d.customExercises?.[id]?.name || id, role: 'main', loadType: ex?.loadType || 'free', startLoadLb: ex ? (ex.start ? ex.start.lb : null) : 1, measure: ex && (ex.loadType === 'time' || ex.pattern === 'grip') ? 'seconds' : 'reps' }; });
  }
  if (!lifts.length) { root.innerHTML = `${pageBar('Progress')}<p class="empty" style="margin-top:20px">Finish a workout and your lifts show up here. Bodyweight and photos too.</p>${photoBlock(d)}<div class="actions inline"><label class="btn quiet" style="cursor:pointer">Add photo<input type="file" accept="image/*" capture="environment" hidden data-change="photo"></label></div>`; bindPhoto(root); return; }
  if (!ui.lift || !lifts.find(l => l.exerciseId === ui.lift)) ui.lift = lifts[0].exerciseId;
  const lift = lifts.find(l => l.exerciseId === ui.lift);
  const hist = store.exerciseHistory(lift.exerciseId).map(h => topSet(h, lift)).filter(Boolean);
  const loaded = lift.startLoadLb != null && hist.some(h => h.weightLb != null);
  const pts = hist.map(h => ({ date: h.date, y: loaded ? displayLoad(h.weightLb || 0, units.load, lift.loadType) : h.reps, note: loaded ? `${h.reps} ${lift.measure === 'seconds' ? 's' : 'reps'}` : '' }));

  const weeks = weeklyWeights(d, today, 12, units);
  const waist = Object.entries(d.days).filter(([, r]) => r.waistCm).map(([date, r]) => ({ date, y: units.body === 'lb' ? r.waistCm / 2.54 : r.waistCm })).sort((a, b) => a.date < b.date ? -1 : 1);
  const measured = MEASURES.filter(([k]) => Object.values(d.days).some(r => r[k]));
  if (!measured.some(([k]) => k === ui.measure)) ui.measure = measured.length ? measured[0][0] : 'waistCm';
  const measSeries = Object.entries(d.days).filter(([, r]) => r[ui.measure]).map(([date, r]) => ({ date, y: units.body === 'lb' ? r[ui.measure] / 2.54 : r[ui.measure] })).sort((a, b) => a.date < b.date ? -1 : 1);

  const nowAvg = weeks.length ? weeks[weeks.length - 1] : null;
  const firstAvg = weeks.length > 1 ? weeks[0] : null;
  const change = nowAvg && firstAvg ? nowAvg.avg - firstAvg.avg : null;
  const lastWaist = waist.length ? waist[waist.length - 1] : null;
  const totalSessions = d.sessions.filter(s => s.completed).length;
  const best = hist.length ? hist.reduce((a, h) => (loaded ? e1rm(h.weightLb, h.reps) > e1rm(a.weightLb, a.reps) : h.reps > a.reps) ? h : a, hist[0]) : null;
  const firstH = hist[0], lastH = hist[hist.length - 1];
  const liftChange = loaded && hist.length > 1 ? displayLoad(lastH.weightLb, units.load, lift.loadType) - displayLoad(firstH.weightLb, units.load, lift.loadType) : null;
  root.innerHTML = `
${pageBar('Progress', [['Weight this week', nowAvg ? `${fmtNum(nowAvg.avg, 1)} ${units.body}` : '–'], ['Waist', lastWaist ? `${fmtNum(lastWaist.y, 1)} ${units.body === 'lb' ? 'in' : 'cm'}` : '–'], ['Workouts', String(totalSessions)]])}
${change != null ? `<p class="small muted" style="margin:0 0 4px">${change >= 0 ? 'Up' : 'Down'} ${fmtNum(Math.abs(change), 1)} ${units.body} since the week of ${fmtShort(firstAvg.start)}.</p>` : ''}

<h2 class="h2" style="margin-top:14px">Lifts</h2>
<div class="field" style="margin-top:0"><label for="liftsel" class="sr">Exercise</label><select id="liftsel" class="input" data-change="lift">${lifts.map(l => `<option value="${l.exerciseId}" ${l.exerciseId === ui.lift ? 'selected' : ''}>${esc(l.name)}</option>`).join('')}</select></div>
${hist.length ? `<div class="stats">
  <div><b>${loaded ? esc(loadText(lastH.weightLb, units, lift.loadType).replace(/ (lb|kg)$/, '')) : lastH.reps}<span class="of">${loaded ? units.load : (lift.measure === 'seconds' ? 's' : 'reps')}</span></b><span>last time, × ${lastH.reps}${liftChange != null && liftChange !== 0 ? `, ${liftChange > 0 ? '+' : ''}${fmtNum(liftChange, 1)} since ${fmtShort(firstH.date)}` : ''}</span></div>
  <div><b>${loaded ? esc(loadText(best.weightLb, units, lift.loadType).replace(/ (lb|kg)$/, '')) : best.reps}<span class="of">${loaded ? units.load : ''}</span></b><span>best set, × ${best.reps} on ${fmtShort(best.date)}</span></div>
  <div><b>${hist.length}</b><span>time${hist.length === 1 ? '' : 's'} logged</span></div>
</div>` : ''}
${lineChart(pts, { unit: loaded ? units.load : (lift.measure === 'seconds' ? 's' : 'reps'), id: 'lift' })}
${hist.length ? `<table><thead><tr><th>Date</th><th class="num">Best set</th><th class="num">${loaded && lift.measure !== 'seconds' ? 'Est. 1 rep max' : ''}</th></tr></thead><tbody>${hist.slice().reverse().slice(0, 6).map(h => `<tr><td>${fmtShort(h.date)}</td><td class="num">${loaded ? loadText(h.weightLb, units, lift.loadType) + ' × ' : ''}${h.reps}${lift.measure === 'seconds' ? ' s' : ''}</td><td class="num">${loaded && lift.measure !== 'seconds' ? loadText(e1rm(h.weightLb, h.reps), units, lift.loadType) : ''}</td></tr>`).join('')}</tbody></table>` : `<p class="small muted">Finish a workout with ${esc(lift.name)} in it and the best set lands here.</p>`}

<h2 class="h2">Personal records</h2>
${prList(d, lifts, units)}

<h2 class="h2">Bodyweight</h2>
<p class="small muted" style="margin-top:-4px">Weekly averages. Single mornings bounce around; the average does not.${plan.diet.weeklyRateKg[0] !== plan.diet.weeklyRateKg[1] ? ` Aim: ${rateText(plan.diet.weeklyRateKg, units)} a week.` : ''}${plan.diet.weightTargetKg ? ` Goal ${bodyText(plan.diet.weightTargetKg, units)}.` : ''}</p>
${weeks.length ? lineChart(weeks.map(w => ({ date: w.start, y: w.avg, note: `${w.n} weigh-ins` })), { unit: units.body, id: 'bw' }) : `<p class="empty">Weigh yourself on the Today tab each morning. The first weekly average shows after one weigh-in.</p>`}
${weeks.length > 1 ? `<table><thead><tr><th>Week of</th><th class="num">Average</th><th class="num">Mornings</th><th class="num">Change</th></tr></thead><tbody>${weeks.slice().reverse().slice(0, 8).map((w, i, arr) => { const prev = arr[i + 1]; const ch = prev ? w.avg - prev.avg : null; return `<tr><td>${fmtShort(w.start)}</td><td class="num">${fmtNum(w.avg, 1)}</td><td class="num">${w.n}</td><td class="num">${ch == null ? '' : (ch > 0 ? '+' : '') + fmtNum(ch, 1)}</td></tr>`; }).join('')}</tbody></table>` : ''}

<h2 class="h2">Measurements</h2>
${measured.length > 1 ? `<div class="chips" style="margin-bottom:6px">${measured.map(([k, l]) => `<button class="chip ${k === ui.measure ? 'on' : ''}" data-action="measure" data-key="${k}">${l}</button>`).join('')}</div>` : ''}
${measSeries.length ? lineChart(measSeries, { unit: units.body === 'lb' ? 'in' : 'cm', id: 'meas' }) : `<p class="empty">Measure the waist on Sundays in the Week tab; chest, arm, thigh and hips monthly. If weight goes up and the waist stays flat, it is muscle.</p>`}

<h2 class="h2">Four weeks ago, and now</h2>
${monthList(d, plan, units, lifts, today)}

<h2 class="h2">Photos</h2>
<p class="small muted" style="margin-top:-4px">Every four weeks, same spot, same light, front and side. The mirror lies day to day; the photos do not.</p>
${photoBlock(d)}
<div class="actions inline"><label class="btn quiet small" style="cursor:pointer">Add photo<input type="file" accept="image/*" capture="environment" hidden data-change="photo"></label></div>`;

  delegate(root, {
    measure: el => { ui.measure = el.dataset.key; renderProgress(root, ctx); },
    del_photo: el => { if (confirm('Delete this photo?')) store.update(x => { x.photos = x.photos.filter(p => p.id !== el.dataset.id); }); },
  });
  root.querySelector('[data-change="lift"]').onchange = e => { ui.lift = e.target.value; renderProgress(root, ctx); };
  bindPhoto(root);
  bindTooltips(root);
}

// Best ever set per exercise, most recent first.
function prList(d, lifts, units) {
  const rows = lifts.map(l => { const h = store.exerciseHistory(l.exerciseId, { includeDeload: false }); let best = null; for (const x of h) { const b = bestSet(x); if (b && (!best || b.score > best.score)) best = { ...b, date: x.date }; } return best ? { name: l.name, loadType: l.loadType, ...best } : null; }).filter(Boolean).sort((a, b) => a.date < b.date ? 1 : -1);
  if (!rows.length) return `<p class="empty">Your first session sets the baseline. Every set after that which beats it shows up here.</p>`;
  return `<ul class="cmp">${rows.map(r => `<li><span>${esc(r.name)}</span><span class="muted">${fmtShort(r.date)}</span><span><b>${r.weightLb ? esc(loadText(r.weightLb, units, r.loadType)) + ' × ' : ''}${r.reps}</b></span></li>`).join('')}</ul>`;
}

function bindPhoto(root) {
  const inp = root.querySelector('[data-change="photo"]');
  if (inp) inp.onchange = async e => { const f = e.target.files[0]; if (!f) return; const dataUrl = await shrink(f, 720); store.update(x => { x.photos.push({ id: Math.random().toString(36).slice(2), date: isoDate(), dataUrl }); }); };
  root.onclick = e => { const b = e.target.closest('[data-action="del_photo"]'); if (b && confirm('Delete this photo?')) store.update(x => { x.photos = x.photos.filter(p => p.id !== b.dataset.id); }); };
}

function topSet(h, lift) {
  const done = h.sets.filter(s => s.done && s.reps != null && s.reps > 0);
  if (!done.length) return null;
  const best = done.reduce((a, s) => s.reps > a.reps ? s : a, done[0]);
  return { date: h.date, weightLb: h.weightLb, reps: best.reps };
}

function weeklyWeights(d, today, n, units) {
  const out = []; const w0 = weekStart(today);
  for (let i = n - 1; i >= 0; i--) {
    const start = addDays(w0, -7 * i);
    const vals = Array.from({ length: 7 }, (_, k) => d.days[addDays(start, k)]?.weightKg).filter(Boolean);
    if (vals.length) out.push({ start, avg: units.body === 'lb' ? kgToLb(mean(vals)) : mean(vals), n: vals.length });
  }
  return out;
}
function rateText([a, b], units) { const f = x => units.body === 'lb' ? fmtNum(kgToLb(x), 1) + ' lb' : fmtNum(x, 2) + ' kg'; return `${f(Math.abs(a))} to ${f(Math.abs(b))}${a < 0 ? ' down' : ' up'}`; }

function monthList(d, plan, units, lifts, today) {
  const now0 = addDays(today, -6), ago1 = addDays(today, -34), ago0 = addDays(today, -28);
  const avgIn = (a, b) => { const v = Object.entries(d.days).filter(([k, r]) => k >= a && k <= b && r.weightKg).map(([, r]) => r.weightKg); return v.length ? mean(v) : null; };
  const waistIn = (a, b) => { const v = Object.entries(d.days).filter(([k, r]) => k >= a && k <= b && r.waistCm).map(([, r]) => r.waistCm); return v.length ? v[v.length - 1] : null; };
  const liftAt = (id, a, b) => { const l = lifts.find(x => x.exerciseId === id); const h = store.exerciseHistory(id).filter(x => x.date >= a && x.date <= b).map(x => topSet(x, l)).filter(Boolean); if (!h.length) return null; const t = h[h.length - 1]; return t.weightLb != null ? loadText(t.weightLb, units, l.loadType) + ' × ' + t.reps : t.reps + (l.measure === 'seconds' ? ' s' : ' reps'); };
  const sessions = (a, b) => d.sessions.filter(s => s.completed && s.date >= a && s.date <= b).length;
  const mains = lifts.filter(l => l.role === 'main' || l.role === 'secondary').slice(0, 6);
  const fmtW = v => v == null ? '–' : bodyText(v, units);
  const fmtWaist = v => v == null ? '–' : (units.body === 'lb' ? fmtNum(v / 2.54, 1) + ' in' : fmtNum(v, 1) + ' cm');
  const rows = [
    ['Bodyweight, 7-day average', fmtW(avgIn(ago1, ago0)), fmtW(avgIn(now0, today))],
    ['Waist', fmtWaist(waistIn(addDays(ago0, -14), ago0)), fmtWaist(waistIn(addDays(today, -14), today))],
    ...MEASURES.filter(([k]) => k !== 'waistCm' && Object.values(d.days).some(r => r[k])).map(([k, l]) => { const at = (a, b) => { const v = Object.entries(d.days).filter(([x, r]) => x >= a && x <= b && r[k]).map(([, r]) => r[k]); return v.length ? v[v.length - 1] : null; }; return [l, fmtWaist(at(addDays(ago0, -30), ago0)), fmtWaist(at(addDays(today, -30), today))]; }),
    ...mains.map(l => [l.name, liftAt(l.exerciseId, addDays(ago0, -13), ago0) ?? '–', liftAt(l.exerciseId, addDays(today, -13), today) ?? '–']),
    ['Workouts in 4 weeks', `${sessions(addDays(ago0, -27), ago0)} of ${(plan.targetPerWeek ?? plan.trainingDays.length) * 4}`, `${sessions(addDays(today, -27), today)} of ${(plan.targetPerWeek ?? plan.trainingDays.length) * 4}`],
  ];
  return `<ul class="cmp"><li class="cmp-head"><span></span><span>4 weeks ago</span><span>Now</span></li>${rows.map(([k, a, b]) => `<li><span>${esc(k)}</span><span class="muted">${esc(a)}</span><span><b>${esc(b)}</b></span></li>`).join('')}</ul>
<p class="small muted" style="margin-top:10px">"Now" is the last 7 days, 14 for lifts. "4 weeks ago" is the same window ending 28 days back.</p>`;
}

function photoBlock(d) {
  const ps = d.photos.slice().sort((a, b) => a.date < b.date ? -1 : 1);
  if (!ps.length) return '';
  const first = ps[0], last = ps[ps.length - 1];
  const cmp = ps.length > 1 && first.date !== last.date ? `<div class="compare"><figure style="margin:0"><img src="${first.dataUrl}" alt="Photo from ${first.date}"><figcaption>${fmtShort(first.date)}</figcaption></figure><figure style="margin:0"><img src="${last.dataUrl}" alt="Photo from ${last.date}"><figcaption>${fmtShort(last.date)}</figcaption></figure></div>` : '';
  return `${cmp}<div class="photos" style="margin-top:12px">${ps.map(p => `<figure style="margin:0"><img src="${p.dataUrl}" alt="Photo from ${p.date}"><figcaption class="small muted">${fmtShort(p.date)} <button class="link small" data-action="del_photo" data-id="${p.id}">delete</button></figcaption></figure>`).join('')}</div>`;
}

function shrink(file, max) {
  return new Promise(res => { const img = new Image(); img.onload = () => { const s = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.8)); URL.revokeObjectURL(img.src); }; img.src = URL.createObjectURL(file); });
}

function bindTooltips(root) {
  root.querySelectorAll('.chartwrap').forEach(wrap => {
    let tip = null;
    wrap.addEventListener('pointerover', e => { const c = e.target.closest('.pt.hit'); if (!c) return; const t = c.querySelector('title')?.textContent; if (!t) return; tip ||= Object.assign(document.createElement('div'), { className: 'tip' }); tip.textContent = t; wrap.appendChild(tip); const r = wrap.getBoundingClientRect(), b = c.getBoundingClientRect(); tip.style.left = (b.left - r.left + b.width / 2) + 'px'; tip.style.top = (b.top - r.top) + 'px'; });
    wrap.addEventListener('pointerout', e => { if (e.target.closest('.pt.hit') && tip) tip.remove(); });
  });
}
