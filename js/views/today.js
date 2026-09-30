// Today: what to do right now. Before a session, the next workout in plain
// words. During a session, one exercise at a time (guided), with the full list
// one tap away. Also the morning weigh-in.

import * as store from '../store.js';
import { suggestNext, swapped, isStalled, lighterLoad, needsLighterWeek, recurringPain, generatePlan, personalRecords, sessionVolumeLb, bestSet } from '../generator.js';
import { PAIN_JOINTS } from '../data/intake.js';
import { DAY_NAMES } from '../data/intake.js';
import { HOWTO, setsText } from '../data/howto.js';
import { EXERCISES } from '../data/exercises.js';
import { VIDEOS } from '../data/videos.js';
import { isoDate, fmtDate, dayOfWeek, weekStart, addDays, displayLoad, toCanonicalLb, loadStep, fmtNum } from '../util.js';
import { esc, delegate, loadText, bodyText, bodyFromInput, bodyToInput } from './ui.js';
import { startText, loadShort } from './words.js';

const ui = { expanded: new Set(), showCues: new Set(), mode: 'guided', step: null };
const timer = { endAt: 0, total: 0, tick: null };

export function renderToday(root, ctx) {
  const d = ctx.doc, plan = d.plan, units = d.settings.units, today = isoDate();
  const session = store.activeSession();
  const free = plan.mode === 'free';
  if (!d.settings.sawIntro && !free) root.innerHTML = intro(d);
  else if (free) root.innerHTML = session ? freeSessionView(d, session, units) : freeIdleView(d, units, today);
  else root.innerHTML = session ? sessionView(d, session, units) : idleView(d, units, today);
  renderDock();

  delegate(root, {
    start_free: () => { const s = store.startFreeSession(); ui.mode = 'list'; ui.expanded = new Set(); store.save(); },
    start_routine: el => { const r = d.routines.find(x => x.id === el.dataset.id); if (!r) return; ui.mode = 'list'; ui.expanded = new Set(r.exercises.slice(0, 1).map(id => 'ex:' + id)); store.startRoutine(r); },
    save_routine: () => { const ids = session.order || Object.keys(session.items); if (!ids.length) return; const name = prompt('Name this routine', 'Routine ' + ((d.routines || []).length + 1)); if (!name) return; store.saveRoutine(name, ids); },
    pick_open: () => { ui.picking = true; ui.q = ''; renderToday(root, ctx); root.querySelector('[data-change="q"]')?.focus(); },
    pick_close: () => { ui.picking = false; renderToday(root, ctx); },
    pick_group: el => { ui.group = el.dataset.g || null; renderToday(root, ctx); },
    pick_mine: () => { ui.onlyMine = !ui.onlyMine; renderToday(root, ctx); },
    pick: el => { const id = el.dataset.id; const h = store.exerciseHistory(id); const last = h.length ? h[h.length - 1] : null; store.addFreeExercise(session.id, id, last ? last.weightLb : (EXERCISES[id]?.start?.lb ?? null)); ui.picking = false; ui.expanded.add('ex:' + id); },
    pick_custom: () => { const name = (ui.q || '').trim().slice(0, 40); if (!name) return; const id = store.addCustomExercise(name); store.addFreeExercise(session.id, id, null); ui.picking = false; ui.expanded.add('ex:' + id); },
    swap_open: el => { ui.swapping = el.dataset.ex; renderToday(root, ctx); },
    swap_close: () => { ui.swapping = null; renderToday(root, ctx); },
    swap: el => { const { from, to } = el.dataset; const planEx = findPlanEx(plan, session, from); const alt = swapped(planEx, to); const h = store.exerciseHistory(to); const sug = suggestNext(alt, h);
      ui.swapping = null; ui.menu = null; if (ui.step === from) ui.step = to; ui.expanded.delete('ex:' + from); ui.expanded.add('ex:' + to);
      store.swapExercise(session.id, from, to, sug.loadLb, sug); },
    add_set: el => { const ex = el.dataset.ex; store.update(x => { const it = x.sessions.find(s => s.id === session.id).items[ex]; const prev = it.sets[it.sets.length - 1]; it.sets.push({ reps: null, done: false, w: prev ? (prev.w ?? it.weightLb) : it.weightLb }); }); },
    menu: el => { const id = el.dataset.ex; ui.menu = ui.menu === id ? null : id; ui.swapping = null; renderToday(root, ctx); },
    note_edit: el => { const id = el.dataset.ex; ui.noteEditing = ui.noteEditing === id ? null : id; ui.menu = null; renderToday(root, ctx); root.querySelector('.exb-noteinput')?.focus(); },
    remove_ex: el => { const ex = el.dataset.ex; store.update(x => { const s = x.sessions.find(s => s.id === session.id); delete s.items[ex]; s.order = s.order.filter(k => k !== ex); }); },
    start_deload: () => { const from = isoDate(); store.update(x => { x.deload = { from, until: addDays(from, 6) }; }); },
    snooze_deload: () => { const from = addDays(isoDate(), -7); store.update(x => { x.deload = { from, until: addDays(isoDate(), -1), snoozed: true }; }); },
    dismiss_notice: () => store.update(x => { x.notice = null; }),
    pain: el => { const j = el.dataset.joint; store.update(x => { const s = x.sessions.find(s => s.id === session.id); s.pain ||= []; if (j === 'none') s.pain = []; else if (s.pain.includes(j)) s.pain = s.pain.filter(k => k !== j); else s.pain.push(j); s.painAsked = true; }); },
    got_it: () => { ui2.introStep = 0; ui2.introAll = false; store.update(x => { x.settings.sawIntro = true; }); },
    intro_go: el => { ui2.introStep = Number(el.dataset.i); renderToday(root, ctx); window.scrollTo(0, 0); },
    intro_all: () => { ui2.introAll = true; renderToday(root, ctx); window.scrollTo(0, 0); },
    intro_one: () => { ui2.introAll = false; renderToday(root, ctx); window.scrollTo(0, 0); },
    start: el => { const src = el.dataset.src || 'main'; const w = store.nextWorkout(src); const s = store.startSession(w, src); prefill(s, w, d); ui.step = 'warmup'; ui.mode = 'guided'; ui.expanded = new Set(['ex:' + w.exercises[0].exerciseId]); store.save(); },
    mode: el => { ui.mode = el.dataset.mode; renderToday(root, ctx); },
    go: el => { ui.step = el.dataset.step; renderToday(root, ctx); window.scrollTo(0, 0); },
    toggle: el => { const k = el.dataset.key; ui.expanded.has(k) ? ui.expanded.delete(k) : ui.expanded.add(k); renderToday(root, ctx); },
    cues: el => { const k = el.dataset.key; ui.showCues.has(k) ? ui.showCues.delete(k) : ui.showCues.add(k); renderToday(root, ctx); },
    check: el => { const k = el.dataset.key; store.update(x => { const s = x.sessions.find(s => s.id === session.id); s.checklist[k] = !s.checklist[k]; }); },
    done: el => { const { ex, i } = el.dataset; const planEx = findPlanEx(plan, session, ex); try { navigator.vibrate && navigator.vibrate(15); } catch {}
      store.update(x => { const it = x.sessions.find(s => s.id === session.id).items[ex]; const set = it.sets[Number(i)]; set.done = !set.done; if (set.w == null) set.w = it.weightLb;
        if (set.done && set.reps == null) {
          // Blank reps: reuse the previous set in this session, then last session's same set, then the plan's minimum.
          const prev = it.sets.slice(0, Number(i)).reverse().find(s => s.done && s.reps != null);
          const hist = store.exerciseHistory(ex); const last = hist.length ? hist[hist.length - 1] : null;
          set.reps = prev ? prev.reps : (last && last.sets[Number(i)] && last.sets[Number(i)].reps != null ? last.sets[Number(i)].reps : (planEx.repMin ?? null));
        }
        syncWeight(it); });
      const it = store.load().sessions.find(s => s.id === session.id).items[ex];
      if (it.sets[Number(i)].done) { const last = Number(i) === it.sets.length - 1; if (!last) startTimer(planEx.restSeconds); else { startTimer(planEx.restSeconds); const w = currentWorkout(plan, session); const nxt = nextUnfinished(store.load().sessions.find(s => s.id === session.id), w); if (nxt) ui.expanded.add(nxt); } }
      renderToday(root, ctx); },
    finish: () => { if (!session) return; const doneSets = countDone(session); if (doneSets === 0 && !confirm('No sets logged. Finish anyway? It will count as a completed session.')) return;
      if (!session.painAsked && session.source !== 'free') { if (ui.mode === 'guided') ui.step = 'finish'; renderToday(root, ctx); root.querySelector('.painrow')?.scrollIntoView({ block: 'center' }); root.querySelector('.painrow')?.classList.add('ask'); return; }
      stopTimer(); const hist = Object.fromEntries(Object.keys(session.items).map(id => [id, store.exerciseHistory(id)])); const prs = personalRecords(session, hist); store.finishSession(session.id, prs); ui.expanded.clear(); ui.step = null; afterFinish(d); },
    discard: () => { if (confirm('Throw this session away? Nothing from it will be saved.')) { stopTimer(); store.abandonSession(session.id); ui.step = null; } },
    cardio_done: () => { const cur = store.day(today).cardio; store.setDay(today, { cardio: !cur }); },
  });
  root.querySelectorAll('[data-change="weight"]').forEach(inp => inp.onchange = () => { const kg = bodyFromInput(inp.value, units); if (kg != null && (kg < 30 || kg > 250)) { inp.value = ''; alert(units.body === 'lb' ? 'Weight should be between 66 and 551 lb.' : 'Weight should be between 30 and 250 kg.'); return; } store.setDay(today, { weightKg: kg }); });
  const q = root.querySelector('[data-change="q"]'); if (q) q.oninput = () => { ui.q = q.value; const list = root.querySelector('#picklist'); if (list) list.innerHTML = pickList(d, ui.q); };
  root.querySelectorAll('[data-change="exnote"]').forEach(inp => inp.onchange = () => { ui.noteEditing = null; store.setExerciseNote(session.id, inp.dataset.ex, inp.value.trim().slice(0, 140)); });
  root.querySelectorAll('[data-change="setw"]').forEach(inp => inp.onchange = () => { const { ex, i } = inp.dataset; const lb = Math.min(2500, Math.max(0, toCanonicalLb(Number(inp.value) || 0, units.load)));
    store.update(x => { const it = x.sessions.find(s => s.id === session.id).items[ex]; const n = Number(i); it.sets[n].w = lb; for (let k = n + 1; k < it.sets.length; k++) if (!it.sets[k].done) it.sets[k].w = lb; syncWeight(it); }); });
  root.querySelectorAll('[data-change="repsin"]').forEach(inp => inp.onchange = () => { const { ex, i } = inp.dataset; store.update(x => { x.sessions.find(s => s.id === session.id).items[ex].sets[Number(i)].reps = Math.min(300, Math.max(0, Math.round(Number(inp.value) || 0))); }); });
}

// ── First run: how this works ───────────────────────────────────
// One point at a time, with the whole list one tap away. Reopened from Plan.

const ui2 = { introStep: 0, introAll: false };
const CHEV = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function introPoints(plan) {
  const days = plan.trainingDays.map(x => DAY_NAMES[x]);
  const dayText = days.length > 1 ? `${days.slice(0, -1).join(', ')} and ${days.at(-1)}` : days[0];
  return [
    { title: 'Your days', text: `You lift on ${dayText}. There are ${plan.workouts.length} different workouts: ${plan.workouts.map(w => `${w.id} (${w.focus.toLowerCase()})`).join(', ')}. They always go in that order, ${plan.workouts.map(w => w.id).join(', ')}, then back to ${plan.workouts[0].id}. No workout belongs to a day of the week. Whichever one is next is the one you do, and the app shows it on the Today screen.` },
    { title: 'Missing a day', text: `Nothing breaks. Say you do ${plan.workouts[0].id} on ${days[0]} and miss ${days[1] || 'the next day'}. On ${days[2] || 'your next gym day'} you do ${plan.workouts[1].id}, because ${plan.workouts[1].id} comes after ${plan.workouts[0].id}. You never do two workouts in one day to catch up, and you never skip ahead.` },
    { title: 'Every exercise is explained', text: 'Tap any exercise name for a video, where it is in your gym, how to set it up and how to do it. Read it before your first try.' },
    { title: 'The first two sessions', text: 'Your first two sessions of each workout are for learning. Light weight, perfect form. The numbers do not matter yet. After that, the app tells you when to add weight.' },
    { title: 'Log as you go', text: 'Tap Done after each set; the row turns yellow and the rest timer starts on its own. Weigh yourself in the morning, and tap the protein count in the Week tab.' },
  ];
}

function intro(d) {
  const pts = introPoints(d.plan);
  if (ui2.introAll) {
    return `
<header class="hero floor">
  <div class="hero-date">Before you start</div>
  <h1 class="display" style="font-size:clamp(48px,14vw,84px)">How this works</h1>
</header>
<ol class="steps-list big-steps">${pts.map(p => `<li><b>${esc(p.title)}.</b> ${esc(p.text)}</li>`).join('')}</ol>
<div class="actions"><button class="btn primary block" data-action="got_it">Got it</button><button class="link" data-action="intro_one">Back to one at a time</button></div>`;
  }
  const i = Math.min(ui2.introStep, pts.length - 1), p = pts[i], last = i === pts.length - 1;
  return `
<header class="hero floor">
  <div class="topbar on-floor">${i > 0 ? `<button class="back" data-action="intro_go" data-i="${i - 1}">${CHEV}Back</button>` : '<span></span>'}<span class="hero-date">How this works, ${i + 1} of ${pts.length}</span></div>
  <h1 class="display" style="font-size:clamp(40px,11vw,72px)">${esc(p.title)}</h1>
  <div class="stack" aria-hidden="true">${pts.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
</header>
<p class="lede" style="font-size:21px;line-height:1.4">${esc(p.text)}</p>
<div class="actions">
  ${last ? `<button class="btn primary block" data-action="got_it">Got it</button>` : `<button class="btn block" data-action="intro_go" data-i="${i + 1}">Next</button>`}
  <button class="link" data-action="intro_all">See all ${pts.length} at once</button>
</div>`;
}

// ── Idle: what's next ───────────────────────────────────────────

function idleView(d, units, today) {
  const plan = d.plan, dow = dayOfWeek(today);
  const next = store.nextWorkout('main');
  const n = store.completedSessions('main').length + 1;
  const isLift = plan.trainingDays.includes(dow), isCardio = plan.cardioDays.includes(dow);
  const doneToday = d.sessions.some(s => s.completed && s.date === today);
  const nextDay = nextTrainingDay(plan, today, doneToday ? 1 : 0);
  const dayRec = store.day(today);
  const learning = isLearning(d, next);

  const notices = idleNotices(d, today, next);
  const lastDone = d.sessions.find(s => s.id === d.lastFinished && s.completed && s.date === today);
  let headline, sub;
  if (doneToday) { headline = 'Done'; sub = 'Session logged. Eat. The next one is ' + (nextDay ? DAY_NAMES[dayOfWeek(nextDay)] : 'soon') + '.'; }
  else if (isLift) { headline = next.focus; sub = `Workout ${next.id}, your session ${n}. Today.`; }
  else { headline = next.focus; sub = `Workout ${next.id} is next, on ${nextDay ? DAY_NAMES[dayOfWeek(nextDay)] : 'your next lifting day'}.`; }

  return `
<header class="hero floor ${doneToday ? 'is-done' : ''}">
  <div class="hero-date">${fmtDate(today)}</div>
  <div class="${doneToday ? 'display' : 'display-words'}">${esc(headline)}</div>
  <p class="sub">${esc(sub)}</p>
  ${doneToday ? summaryStats(lastDone, units) : `<button class="btn primary block" data-action="start" data-src="main">Start workout ${esc(next.id)}</button>`}
</header>
${lastDone && lastDone.prs && lastDone.prs.length ? prBand(lastDone, units) : ''}
${notices}
${missedWeek(d, today)}
${learning && !doneToday ? `<div class="note"><p><b>Learning session.</b> Light weight, good form, read each exercise page before you try it. The numbers do not matter yet.</p></div>` : ''}
<div class="actions" style="margin-top:8px">
  ${isCardio ? cardioRow(plan, dayRec, isLift) : ''}
  ${!isLift && !isCardio && !doneToday ? `<p class="muted">Rest day. Eat to target, walk if you like, sleep.</p>` : ''}
  <button class="link" data-action="start" data-src="fallback">No gym today? Do the no-equipment workout</button>
</div>
${weighRow(dayRec, units, today)}
${preview(next, d, units)}`;
}

// Notices above the Today screen: a plan change after reported pain, a lighter
// week in progress, or the suggestion to start one.
function idleNotices(d, today, next) {
  const out = [];
  if (d.notice) out.push(`<div class="note"><p>${esc(d.notice)}</p><button class="link" data-action="dismiss_notice">Got it</button></div>`);
  if (store.deloadActive(today)) {
    const day = Math.min(7, Math.max(1, Math.round((new Date(today) - new Date(d.deload.from)) / 86400000) + 1));
    out.push(`<div class="note"><p><b>Lighter week, day ${day} of 7.</b> Same workouts, seventy percent of the weight, two sets each. This is planned recovery, not a setback. Normal weights come back next week.</p></div>`);
    return out.join('');
  }
  if (d.plan.mode === 'plan') {
    const lifts = d.plan.workouts.flatMap(w => w.exercises).filter(e => e.role === 'main' || e.role === 'secondary');
    const stalled = lifts.filter(e => isStalled(e, store.exerciseHistory(e.exerciseId)));
    const why = needsLighterWeek({ plan: d.plan, sessions: d.sessions, stalledCount: stalled.length, today, since: d.deload?.until });
    if (why) out.push(`<div class="note warn"><p><b>Time for a lighter week.</b> ${esc(why)}${stalled.length ? ' Stalled: ' + esc(stalled.map(e => e.name).join(', ')) + '.' : ''} Seven days at seventy percent and two sets, then the weights start moving again. Every good program has one.</p><div class="actions inline" style="margin:8px 0 0"><button class="btn small" data-action="start_deload">Start the lighter week</button><button class="link" data-action="snooze_deload">Not this week</button></div></div>`);
  }
  return out.join('');
}

// The three numbers of a finished session, in the band.
function summaryStats(s, units) {
  if (!s) return '';
  const mins = s.finishedAt ? Math.round((s.finishedAt - s.startedAt) / 60000) : 0;
  const sets = Object.values(s.items).reduce((a, it) => a + it.sets.filter(x => x.done && x.reps > 0).length, 0);
  const vol = sessionVolumeLb(s);
  const volShown = units.load === 'kg' ? Math.round(vol / 2.2046) : Math.round(vol);
  return `<div class="stats on-floor"><div><b>${mins}<span class="of">min</span></b><span>in the gym</span></div><div><b>${sets}</b><span>sets logged</span></div><div><b>${fmtNum(volShown)}</b><span>${units.load} lifted in total</span></div></div>`;
}
function prBand(s, units) {
  return `<div class="note pr"><p><b>${s.prs.length === 1 ? 'Personal record' : s.prs.length + ' personal records'}.</b> ${s.prs.map(p => `${esc(EXERCISES[p.exerciseId]?.name || store.load().customExercises?.[p.exerciseId]?.name || p.exerciseId)}: ${p.weightLb ? loadShort(p.weightLb, units, EXERCISES[p.exerciseId]?.loadType || 'free') + ' × ' : ''}${p.reps}`).join('; ')}. Best you have ever done.</p></div>`;
}

function isLearning(d, w) { return d.sessions.filter(s => s.completed && s.workoutId === w.id && s.source === 'main').length < 2; }

function cardioRow(plan, rec, withLift) {
  return `<div class="logrow"><div class="logl"><b>${esc(plan.cardio.name)}${withLift ? ', after lifting' : ''}</b><span>${withLift ? '10 to 20 easy minutes on the rower or bike once the sets are done. Optional.' : esc(plan.cardio.text)}</span></div><button class="donebtn" aria-pressed="${!!rec.cardio}" data-action="cardio_done">${rec.cardio ? 'Done ✓' : 'Done'}</button></div>`;
}

function weighRow(rec, units, today) {
  return `<div class="signal" style="margin-top:8px"><div><div class="lbl">Morning weight</div><div class="sub">After the bathroom, before food. ${rec.weightKg ? 'Logged: ' + bodyText(rec.weightKg, units) : ''}</div></div>
  <input class="input" style="width:110px;text-align:right" type="number" inputmode="decimal" step="0.1" placeholder="${units.body}" value="${bodyToInput(rec.weightKg, units)}" data-change="weight" aria-label="Morning weight in ${units.body}"></div>`;
}

function preview(w, d, units) {
  const mins = Math.round(w.exercises.reduce((a, e) => a + e.sets * (e.restSeconds + 45), 0) / 60) + 8;
  return `<h2 class="h2">In workout ${esc(w.id)}</h2>
<p class="small muted" style="margin:-4px 0 8px">${w.exercises.length} exercises, about ${mins} minutes with warm-up. Tap one to see how to do it.</p>
<ul class="rows">${w.exercises.map((e, i) => { const h = store.exerciseHistory(e.exerciseId); const sug = suggestNext(e, h);
  return `<li class="row"><a class="row-head link-row" style="grid-template-columns:44px 1fr auto" href="#exercise/${e.exerciseId}"><span class="tag">${i + 1}</span><span><span class="row-title">${esc(e.name)}</span><br><span class="row-sub">${esc(setsText(e))}</span></span>${sugMark(sug, e, units, h)}</a></li>`; }).join('')}</ul>`;
}

// The right-hand mark on a preview row: what you'll lift, and whether it moved.
function sugMark(sug, e, units, h) {
  if (sug.loadLb == null) return `<span class="mark ${h.length ? '' : 'new'}">${h.length ? 'bodyweight' : 'new'}</span>`;
  const t = loadShort(sug.loadLb, units, e.loadType);
  if (sug.reason === 'start') return `<span class="mark new">new · ${esc(t)}</span>`;
  if (sug.reason === 'up') return `<span class="mark up">↑ ${esc(t)}</span>`;
  if (sug.reason === 'down') return `<span class="mark down">↓ ${esc(t)}</span>`;
  return `<span class="mark">${esc(t)}</span>`;
}

function sugText(sug, e, units) {
  if (sug.loadLb == null) return '';
  const t = loadShort(sug.loadLb, units, e.loadType);
  if (sug.reason === 'start') return t;
  if (sug.reason === 'up') return '↑ ' + t;
  if (sug.reason === 'down') return '↓ ' + t;
  return t;
}

function missedWeek(d, today) {
  const plan = d.plan; if (!plan || !d.profile) return '';
  const tone = d.profile.tone || 'plain'; if (tone === 'silent') return '';
  const thisWeek = weekStart(today), lastWeek = addDays(thisWeek, -7);
  if (plan.createdAt >= lastWeek) return '';
  const planned = plan.targetPerWeek;
  const done = d.sessions.filter(s => s.completed && s.date >= lastWeek && s.date < thisWeek).length;
  if (done >= planned) return '';
  const next = store.nextWorkout('main');
  const msg = tone === 'loud'
    ? `Last week: ${done} of ${planned}. That is not a plan, that is a wish. ${next.id} is next. Go.`
    : `Last week you planned ${planned} sessions and did ${done}. Nothing to make up. The next workout is ${next.id}.`;
  return `<div class="note ${tone === 'loud' ? 'warn' : ''}"><p>${esc(msg)}</p></div>`;
}

function nextTrainingDay(plan, today, from = 0) {
  for (let i = from; i < 8 + from; i++) { const d = addDays(today, i); if (plan.trainingDays.includes(dayOfWeek(d))) return d; }
  return null;
}

// ── Session ─────────────────────────────────────────────────────

function prefill(s, w, d) {
  for (const e of w.exercises) {
    const h = store.exerciseHistory(e.exerciseId);
    const sug = suggestNext(e, h);
    const it = s.items[e.exerciseId];
    it.weightLb = s.deload ? lighterLoad(sug.loadLb, e.loadType) : sug.loadLb; it.suggested = s.deload ? { loadLb: it.weightLb, reason: 'deload' } : sug;
    if (s.deload) it.sets = it.sets.slice(0, 2);
    it.sets.forEach(set => { set.w = it.weightLb; set.reps = null; });
  }
}
function currentWorkout(plan, s) {
  if (s.source === 'free') return { id: 'free', name: 'Your workout', focus: 'Your workout', exercises: (s.order || []).map(id => freePlanEx(id, s)) };
  const w = (s.source === 'fallback' ? plan.fallback : plan.workouts).find(w => w.id === s.workoutId);
  const lighter = ex => s.deload ? { ...ex, sets: Math.min(2, ex.sets) } : ex;
  if (!s.swaps || !Object.keys(s.swaps).length) return s.deload ? { ...w, exercises: w.exercises.map(lighter) } : w;
  // Follow swap chains (A swapped to B, B swapped to C) to the exercise actually in play.
  const resolve = e => { let cur = e; const seen = new Set(); while (s.swaps[cur.exerciseId] && !seen.has(cur.exerciseId)) { seen.add(cur.exerciseId); cur = swapped(cur, s.swaps[cur.exerciseId]); } return cur; };
  return { ...w, exercises: w.exercises.map(e => lighter(resolve(e))) };
}
function findPlanEx(plan, s, exId) { return currentWorkout(plan, s).exercises.find(e => e.exerciseId === exId); }
// In self-driven mode an exercise has no target range; sets grow as you add them.
function freePlanEx(id, s) {
  const ex = EXERCISES[id]; const custom = store.load().customExercises?.[id];
  return { exerciseId: id, name: ex?.name || custom?.name || id, role: 'main', sets: s.items[id]?.sets.length || 3, repMin: null, repMax: null,
    measure: ex && (ex.loadType === 'time' || ex.pattern === 'grip') ? 'seconds' : 'reps', loadType: ex ? ex.loadType : 'free',
    startLoadLb: ex ? (ex.start ? ex.start.lb : null) : null, incrementLb: ex?.increment?.lb ?? 5, restSeconds: 90, cues: ex?.cues || [], altId: null, free: true };
}
// The item's working weight is the heaviest completed set (the first set's weight
// until one is done). Progression and history read this one number.
function syncWeight(it) { const ws = it.sets.filter(x => x.done && x.w != null).map(x => x.w); it.weightLb = ws.length ? Math.max(...ws) : (it.sets[0]?.w ?? it.weightLb); }
function countDone(s) { return Object.values(s.items).reduce((a, it) => a + it.sets.filter(x => x.done).length, 0); }
function nextUnfinished(s, w) { const e = w.exercises.find(e => s.items[e.exerciseId].sets.some(x => !x.done)); return e ? 'ex:' + e.exerciseId : null; }

// Steps in a guided session: warmup, one per exercise, then finish.
function stepsOf(w) { return ['warmup', ...w.exercises.map(e => e.exerciseId), 'finish']; }
function currentStep(s, w) {
  const steps = stepsOf(w);
  if (ui.step && steps.includes(ui.step)) return ui.step;
  if (!s.checklist.warmup) return 'warmup';
  const e = w.exercises.find(e => s.items[e.exerciseId].sets.some(x => !x.done));
  return e ? e.exerciseId : 'finish';
}

function sessionView(d, s, units) {
  const plan = d.plan, w = currentWorkout(plan, s);
  const learning = isLearning(d, w);
  const note = s.deload ? 'Lighter week: seventy percent, two sets.' : learning ? 'Learning session: light weight, good form.' : '';
  return `
${sessionBar(s, w, units, `Workout ${esc(w.id)}: ${esc(w.focus)}`)}
${note ? `<p class="small muted" style="margin:0 0 10px">${note}</p>` : ''}
<div class="seg modeswitch"><button aria-pressed="${ui.mode === 'guided'}" data-action="mode" data-mode="guided">One at a time</button><button aria-pressed="${ui.mode === 'list'}" data-action="mode" data-mode="list">Whole workout</button></div>
${ui.mode === 'guided' ? guided(d, s, w, units) : list(d, s, w, units)}
<div class="actions" style="margin-top:20px"><button class="link" data-action="discard">Discard this session</button></div>`;
}

// The slim bar on top of every session: what, how long, how much, and Finish.
function sessionBar(s, w, units, title) {
  const mins = Math.round((Date.now() - s.startedAt) / 60000);
  const sets = Object.values(s.items).reduce((a, it) => a + it.sets.filter(x => x.done).length, 0);
  const total = w.exercises.reduce((a, e) => a + (s.items[e.exerciseId]?.sets.length || 0), 0);
  const vol = sessionVolumeLb(s);
  const volShown = units.load === 'kg' ? Math.round(vol / 2.2046) : Math.round(vol);
  return `<div class="sbar">
  <div class="sbar-top"><span class="sbar-title">${title}</span><button class="btn primary small" data-action="finish">Finish</button></div>
  <div class="sbar-stats"><div><span>Time</span><b>${mins < 60 ? mins + ' min' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'min'}</b></div><div><span>Volume</span><b>${fmtNum(volShown)} ${units.load}</b></div><div><span>Sets</span><b>${sets}${total ? ' of ' + total : ''}</b></div></div>
</div>`;
}

function guided(d, s, w, units) {
  const plan = d.plan, steps = stepsOf(w), cur = currentStep(s, w), i = steps.indexOf(cur);
  const prev = steps[i - 1], next = steps[i + 1];
  const top = `<div class="topbar">${prev ? `<button class="back" data-action="go" data-step="${prev}">${CHEV}Back</button>` : '<span></span>'}<span class="small muted">${i + 1} of ${steps.length}</span></div>`;
  const nav = next ? `<div class="actions" style="margin-top:18px"><button class="btn block" data-action="go" data-step="${next}">${next === 'finish' ? 'Finish up' : 'Next: ' + esc(w.exercises.find(e => e.exerciseId === next).name)}</button></div>` : '';
  if (cur === 'warmup') {
    return `${top}<section class="exb">
      <div class="exb-head"><span class="exb-thumb tag">0</span><div class="exb-name"><b>Warm up</b><span class="exb-sub">About five minutes</span></div></div>
      <ol class="steps-list">${plan.warmup.map(x => `<li>${esc(x.text)}</li>`).join('')}</ol>
      <button class="btn ${s.checklist.warmup ? 'quiet' : 'primary'} block" data-action="check" data-key="warmup">${s.checklist.warmup ? 'Warm-up done ✓' : 'Warm-up done'}</button>
    </section>${nav}`;
  }
  if (cur === 'finish') return `${top}${finishBlock(d, s, w)}`;
  const e = w.exercises.find(e => e.exerciseId === cur);
  return `${top}${exBlock(e, s.items[cur], units, d, s)}${nav}`;
}

function list(d, s, w, units) {
  const plan = d.plan;
  return `<div class="exb warm ${s.checklist.warmup ? 'done' : ''}">
    <div class="exb-head"><span class="exb-thumb tag">0</span><div class="exb-name"><b>Warm up</b><span class="exb-sub">${esc(plan.warmup.map(x => x.text.split('.')[0]).join('. '))}.</span></div>
    <button class="st-ok" aria-pressed="${s.checklist.warmup}" data-action="check" data-key="warmup" aria-label="Warm-up done">✓</button></div>
  </div>
  ${w.exercises.map(e => exBlock(e, s.items[e.exerciseId], units, d, s)).join('')}
  ${finishBlock(d, s, w)}`;
}

// End of a plan session: pain check, cool-down, protein, Finish.
function finishBlock(d, s, w) {
  const plan = d.plan;
  const left = w.exercises.filter(e => s.items[e.exerciseId].sets.some(x => !x.done));
  return `<section class="exb">
    <div class="exb-head"><span class="exb-thumb tag">✓</span><div class="exb-name"><b>Finish up</b><span class="exb-sub">Three quick things, then Finish</span></div></div>
    ${left.length && left.length < w.exercises.length ? `<p class="small warn" style="margin:0 0 8px">Not logged: ${left.map(e => esc(e.name)).join(', ')}.</p>` : ''}
    ${painRow(s)}
    <div class="log">
      <div class="logrow"><div class="logl"><b>Cool down</b><span>${esc(plan.cooldown.map(x => x.text.split('.')[0]).join('. '))}.</span></div><button class="st-ok" aria-pressed="${s.checklist.cooldown}" data-action="check" data-key="cooldown" aria-label="Cool-down done">✓</button></div>
      <div class="logrow"><div class="logl"><b>Protein</b><span>${esc(plan.diet.meals.find(m => m.slot === 'post')?.text || 'Protein within an hour.')}</span></div><button class="st-ok" aria-pressed="${s.checklist.protein}" data-action="check" data-key="protein" aria-label="Protein done">✓</button></div>
    </div>
    <button class="btn primary block" style="margin-top:16px" data-action="finish">Finish session</button>
  </section>`;
}

// One exercise, Hevy-style: a header, one line of guidance, the rest time,
// and a table of sets. Everything else lives behind the ⋮ menu.
function exBlock(e, it, units, d, s) {
  const id = e.exerciseId, v = VIDEOS[id];
  const hasLoad = !['body', 'time'].includes(e.loadType);
  const h = store.exerciseHistory(id); const last = h.length ? h[h.length - 1] : null;
  const prevNote = store.lastNote(id);
  const menuOpen = ui.menu === id;
  const rest = e.restSeconds >= 60 ? `${fmtNum(e.restSeconds / 60, 1)} min` : `${e.restSeconds} s`;
  const shown = lb => lb == null ? '' : fmtNum(displayLoad(lb, units.load, e.loadType), 1);
  return `<section class="exb" id="ex-${id}">
    <div class="exb-head">
      <a class="exb-thumb" href="#exercise/${id}" aria-label="How to do ${esc(e.name)}">${v ? `<img src="https://i.ytimg.com/vi/${encodeURIComponent(v.id)}/mqdefault.jpg" alt="" loading="lazy">` : esc(e.name[0])}</a>
      <div class="exb-name"><a href="#exercise/${id}">${esc(e.name)}</a><span class="exb-sub">${esc(subline(e, it))}</span></div>
      <button class="exb-more" data-action="menu" data-ex="${id}" aria-expanded="${menuOpen}" aria-label="More for ${esc(e.name)}">⋮</button>
    </div>
    ${menuOpen ? menuHtml(e) : ''}
    ${e.swappedFrom ? `<p class="exb-line muted">Swapped in for ${esc(EXERCISES[e.swappedFrom]?.name || e.swappedFrom)} this session.</p>` : ''}
    ${ui.noteEditing === id
      ? `<input class="input exb-noteinput" type="text" maxlength="140" placeholder="Felt heavy, left shoulder clicked" value="${esc(it.note || '')}" data-change="exnote" data-ex="${id}" aria-label="Note for ${esc(e.name)}">`
      : it.note ? `<p class="exb-line">${esc(it.note)}</p>`
      : prevNote ? `<p class="exb-line muted">Last time: “${esc(prevNote.note)}”</p>` : ''}
    <p class="exb-rest"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l2 2M9 2h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>Rest ${rest}</p>
    <div class="st ${hasLoad ? '' : 'noload'}">
      <div class="st-h"><span>Set</span><span>Previous</span>${hasLoad ? `<span>${units.load}</span>` : ''}<span>${e.measure === 'seconds' ? 'Secs' : 'Reps'}</span><span aria-label="Done">✓</span></div>
      ${it.sets.map((set, i) => { const p = last && last.sets[i]; const pw = p ? (p.w ?? last.weightLb) : null;
        const prevText = p && p.done && p.reps ? (hasLoad && pw ? `${shown(pw)} × ${p.reps}` : `${p.reps}`) : '–';
        return `<div class="st-r ${set.done ? 'done' : ''}">
        <span class="st-n">${i + 1}</span>
        <span class="st-prev">${prevText}</span>
        ${hasLoad ? `<input type="number" inputmode="decimal" step="any" value="${shown(set.w ?? it.weightLb)}" placeholder="0" data-change="setw" data-ex="${id}" data-i="${i}" aria-label="Set ${i + 1} weight in ${units.load}">` : ''}
        <input type="number" inputmode="numeric" value="${set.reps ?? ''}" placeholder="${(p && p.reps) || e.repMin || ''}" data-change="repsin" data-ex="${id}" data-i="${i}" aria-label="Set ${i + 1} ${e.measure}">
        <button class="st-ok" aria-pressed="${set.done}" data-action="done" data-ex="${id}" data-i="${i}" aria-label="Set ${i + 1} ${set.done ? 'done, tap to undo' : 'done'}">✓</button>
      </div>`; }).join('')}
    </div>
    <button class="st-add" data-action="add_set" data-ex="${id}">+ Add set</button>
  </section>`;
}

// One line under the exercise name: the target and the weight advice.
function subline(e, it) {
  const parts = [];
  if (e.repMin != null) parts.push(`Aim ${e.repMin}–${e.repMax} ${e.measure === 'seconds' ? 'seconds' : 'reps'}`);
  const sug = it.suggested || {};
  if (sug.reason === 'deload') parts.push('Lighter week');
  else if (sug.reason === 'up') parts.push('Weight up from last time');
  else if (sug.reason === 'down') parts.push('Ten percent off, build back');
  else if (sug.reason === 'start') parts.push('Start light');
  if (e.loadType === 'dumbbell') parts.push('Weight is per hand');
  return parts.join('. ');
}

function menuHtml(e) {
  const id = e.exerciseId;
  const swapping = ui.swapping === id;
  return `<div class="exb-menu">
    <a href="#exercise/${id}">How to do it</a>
    ${e.alts && e.alts.length ? `<button data-action="${swapping ? 'swap_close' : 'swap_open'}" data-ex="${id}">Swap exercise</button>` : ''}
    ${swapping ? `<div class="exb-alts">${e.alts.map(a => `<button data-action="swap" data-from="${id}" data-to="${a.id}">${esc(a.name)}<span>${EXERCISES[a.id]?.equipment.length === 0 ? 'no equipment' : 'same movement'}</span></button>`).join('')}</div>` : ''}
    <button data-action="note_edit" data-ex="${id}">${ui.noteEditing === id ? 'Done with note' : 'Add a note'}</button>
    ${e.free ? `<button class="warn" data-action="remove_ex" data-ex="${id}">Remove exercise</button>` : ''}
  </div>`;
}

// After a session: the same joint reported twice in the last three sessions
// becomes part of the profile and the plan is rebuilt around it.
function afterFinish(d) {
  if (d.plan.mode !== 'plan') return;
  const joints = recurringPain(store.load().sessions).filter(j => !(d.profile.pain || []).includes(j));
  if (!joints.length) return;
  store.update(x => {
    x.profile = { ...x.profile, pain: [...(x.profile.pain || []), ...joints] };
    const fresh = generatePlan(x.profile);
    if (fresh.blocked) return;
    fresh.createdAt = x.plan.createdAt; x.plan = fresh;
    x.notice = `You have flagged ${joints.map(j => PAIN_JOINTS[j] || j).join(' and ')} after two of your last three sessions. The plan now avoids exercises that load ${joints.length > 1 ? 'those joints' : 'that joint'} and has swapped in alternatives. If it keeps hurting outside the gym, see a physio; the app cannot diagnose anything.`;
  });
}

// "Anything hurt?" Asked once per session, on the finish card.
function painRow(s) {
  const pain = s.pain || [];
  return `<div class="painrow"><div class="logl"><b>Anything hurt?</b><span>Joints, not muscles. Muscle soreness is normal.</span></div>
  <div class="chips" style="margin:8px 0 0">${[['none', 'No'], ...Object.entries(PAIN_JOINTS)].map(([k, l]) => `<button class="chip ${k === 'none' ? (s.painAsked && !pain.length ? 'on' : '') : (pain.includes(k) ? 'on' : '')}" data-action="pain" data-joint="${k}">${esc(l)}</button>`).join('')}</div></div>`;
}

// ── Self-driven mode ────────────────────────────────────────────

function freeIdleView(d, units, today) {
  const plan = d.plan, dayRec = store.day(today);
  const wk = weekStart(today);
  const thisWeek = d.sessions.filter(s => s.completed && s.date >= wk).length;
  const doneToday = d.sessions.some(s => s.completed && s.date === today);
  const lastS = d.sessions.filter(s => s.completed).slice(-1)[0];
  return `
<header class="hero floor ${doneToday ? 'is-done' : ''}">
  <div class="hero-date">${fmtDate(today)}</div>
  <div class="${doneToday ? 'display' : 'display-words'}">${doneToday ? 'Done' : 'Your workout'}</div>
  <p class="sub">${doneToday ? 'Logged for today. Another one is fine if you want it.' : `${thisWeek} of ${plan.targetPerWeek} this week. Whatever you do, log it here.`}</p>
  ${doneToday ? summaryStats(d.sessions.find(s => s.id === d.lastFinished && s.date === today), units) : ''}
  <button class="btn ${doneToday ? '' : 'primary'} block" data-action="start_free">Start an empty workout</button>
</header>
${(d.routines || []).length ? `<h2 class="h2" style="margin-top:14px">Your routines</h2><ul class="rows">${d.routines.map(r => `<li class="row"><div class="row-head" style="grid-template-columns:1fr auto"><span><span class="row-title">${esc(r.name)}</span><br><span class="row-sub">${r.exercises.map(id => EXERCISES[id]?.name || d.customExercises?.[id]?.name || id).join(', ')}</span></span><button class="btn small" data-action="start_routine" data-id="${r.id}">Start</button></div></li>`).join('')}</ul>` : ''}
${(() => { const ls = d.sessions.find(s => s.id === d.lastFinished && s.date === today); return ls && ls.prs && ls.prs.length ? prBand(ls, units) : ''; })()}
${weighRow(dayRec, units, today)}
${lastS ? `<h2 class="h2">Last time, ${fmtDate(lastS.date, { weekday: 'long', day: 'numeric', month: 'short' })}</h2>
<ul class="rows">${(lastS.order || Object.keys(lastS.items)).map(id => { const it = lastS.items[id]; if (!it) return ''; const e = freePlanEx(id, lastS); const done = it.sets.filter(x => x.done); if (!done.length) return '';
  return `<li class="row"><a class="row-head link-row" style="grid-template-columns:1fr auto" href="#exercise/${id}"><span><span class="row-title">${esc(e.name)}</span><br><span class="row-sub">${done.length} set${done.length === 1 ? '' : 's'}: ${done.map(x => x.reps).join(', ')}</span></span><span class="row-meta">${it.weightLb != null ? loadShort(it.weightLb, units, e.loadType) : ''}</span></a></li>`; }).join('')}</ul>` : `<p class="muted" style="margin-top:20px">Nothing logged yet. Start a workout, add the exercises you do, tap Done after each set.</p>`}`;
}

function freeSessionView(d, s, units) {
  const plan = d.plan, w = currentWorkout(plan, s);
  return `
${sessionBar(s, w, units, 'Your workout')}
${ui.picking ? picker(d) : ''}
${w.exercises.map(e => exBlock(e, s.items[e.exerciseId], units, d, s)).join('')}
<button class="st-add big" data-action="pick_open">+ Add exercise</button>
<div class="log" style="margin-top:14px"><div class="logrow"><div class="logl"><b>Protein after</b><span>A shake, eggs, curd or chicken within an hour.</span></div><button class="st-ok" aria-pressed="${s.checklist.protein}" data-action="check" data-key="protein" aria-label="Protein done">✓</button></div></div>
<div class="actions" style="margin-top:20px">
  <button class="btn primary block" data-action="finish">Finish workout</button>
  ${w.exercises.length ? `<button class="link" data-action="save_routine">Save these exercises as a routine</button>` : ''}
  <button class="link" data-action="discard">Discard this workout</button>
</div>`;
}

function picker(d) {
  return `<div class="band picker">
  <div class="topbar" style="margin-bottom:8px"><b>Add an exercise</b><button class="back" data-action="pick_close">Close</button></div>
  <input class="input" type="search" placeholder="Search, or type your own" value="${esc(ui.q || '')}" data-change="q" autocomplete="off">
  <div id="picklist" style="margin-top:8px">${pickList(d, ui.q || '')}</div>
</div>`;
}

const MUSCLE_GROUPS = [['chest', /chest/], ['back', /back|lats/], ['shoulders', /shoulder|traps/], ['arms', /biceps|triceps|forearms/], ['legs', /quads|hamstrings|glutes|calves|thighs|hips/], ['core', /core|abs|obliques/], ['cardio', /heart|whole body/]];
function muscleGroup(ex) { const all = [...(ex.muscles?.primary || []), ...(ex.muscles?.secondary || [])].join(' '); return MUSCLE_GROUPS.filter(([, re]) => re.test(all)).map(([g]) => g); }
export { MUSCLE_GROUPS, muscleGroup };

function pickList(d, q) {
  const needle = q.trim().toLowerCase();
  const recent = [...new Set(d.sessions.filter(s => s.completed).flatMap(s => s.order || Object.keys(s.items)).reverse())].slice(0, 6);
  const customs = Object.entries(d.customExercises || {}).map(([id, c]) => ({ id, name: c.name, custom: true }));
  const have = new Set(d.profile?.equipment || []);
  const catalogue = Object.entries(EXERCISES).filter(([, e]) => !ui.onlyMine || e.equipment.every(k => have.has(k))).filter(([, e]) => !ui.group || muscleGroup(e).includes(ui.group)).map(([id, e]) => ({ id, name: e.name, sub: (e.muscles?.primary || []).join(', ') }));
  const all = [...customs, ...catalogue];
  const hits = needle ? all.filter(x => x.name.toLowerCase().includes(needle)) : [...recent.map(id => all.find(x => x.id === id)).filter(Boolean), ...all.filter(x => !recent.includes(x.id))];
  const exact = needle && all.some(x => x.name.toLowerCase() === needle);
  return `<div class="chips" style="margin-bottom:8px"><button class="chip ${!ui.group ? 'on' : ''}" data-action="pick_group" data-g="">All</button>${MUSCLE_GROUPS.map(([g]) => `<button class="chip ${ui.group === g ? 'on' : ''}" data-action="pick_group" data-g="${g}">${g[0].toUpperCase() + g.slice(1)}</button>`).join('')}<button class="chip ${ui.onlyMine ? 'on' : ''}" data-action="pick_mine">My gym only</button></div>
  <ul class="rows">${hits.slice(0, needle ? 20 : 60).map(x => `<li class="row"><button class="row-head" style="grid-template-columns:1fr auto" data-action="pick" data-id="${x.id}"><span><span class="row-title">${esc(x.name)}</span>${x.sub ? `<br><span class="row-sub">${esc(x.sub)}</span>` : ''}</span><span class="row-meta">${x.custom ? 'yours' : recent.includes(x.id) && !needle ? 'recent' : ''}</span></button></li>`).join('')}
  ${needle && !exact ? `<li class="row"><button class="row-head" style="grid-template-columns:1fr auto" data-action="pick_custom"><span class="row-title">Add "${esc(q.trim())}" as your own exercise</span><span class="row-meta">new</span></button></li>` : ''}</ul>`;
}

// ── Rest timer (docked) ─────────────────────────────────────────

function startTimer(seconds) {
  timer.endAt = Date.now() + seconds * 1000; timer.total = seconds; timer.fired = false;
  clearInterval(timer.tick); timer.tick = setInterval(renderDock, 500); renderDock();
}
function stopTimer() { clearInterval(timer.tick); timer.tick = null; timer.endAt = 0; renderDock(); }
function renderDock() {
  const dock = document.getElementById('dock'); if (!dock) return;
  if (!timer.endAt) { dock.hidden = true; dock.innerHTML = ''; return; }
  const left = Math.ceil((timer.endAt - Date.now()) / 1000);
  const over = left <= 0;
  if (over && !timer.fired) { timer.fired = true; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch {} beep(); }
  const pct = Math.max(0, Math.min(100, (1 - left / timer.total) * 100));
  const mm = Math.floor(Math.abs(left) / 60), ss = String(Math.abs(left) % 60).padStart(2, '0');
  dock.hidden = false;
  dock.innerHTML = `<div class="timer ${over ? 'over' : ''}" role="timer" aria-live="off"><div class="timer-l"><span class="small">${over ? 'Rest over' : 'Rest'}</span><span class="t">${over ? '+' : ''}${mm}:${ss}</span></div><div class="bar"><div style="clip-path:inset(0 ${over ? 0 : (100 - pct).toFixed(1)}% 0 0)"></div></div><div class="timer-b"><button data-action="add30">+30 s</button><button data-action="skip_timer">${over ? 'Close' : 'Skip'}</button></div></div>`;
  dock.onclick = e => { const b = e.target.closest('[data-action]'); if (!b) return; if (b.dataset.action === 'add30') { timer.endAt += 30000; timer.total += 30; timer.fired = false; renderDock(); } else stopTimer(); };
}
function beep() {
  try { const ac = new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(); const g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.value = 0.08; o.start(); o.stop(ac.currentTime + 0.25); } catch {}
}
