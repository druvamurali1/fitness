// Plan: the whole program and diet in one place, plus settings and backup.

import * as store from '../store.js';
import { DAY_NAMES } from '../data/intake.js';
import { esc, delegate, loadText, bodyText, applyTheme } from './ui.js';
import { fmtNum } from '../util.js';
import { setsText } from '../data/howto.js';
import { EXERCISES, PATTERN_PREFERENCE } from '../data/exercises.js';
import { freePlan } from '../generator.js';
import { startText, loadShort } from './words.js';

const ui = { open: new Set() };

export function renderPlan(root, ctx) {
  const d = ctx.doc, plan = d.plan, p = d.profile, units = d.settings.units, diet = plan.diet;
  if (plan.mode === 'free') { renderFree(root, ctx); return; }
  const days = plan.trainingDays.map(x => DAY_NAMES[x]);
  root.innerHTML = `
<header class="hero floor">
  <div class="hero-date">${p?.name ? esc(p.name) + "'s plan" : 'Your plan'}</div>
  <div class="display-words">${esc(plan.splitName)}</div>
  <div class="stats on-floor">
    <div><b>${plan.trainingDays.length}</b><span>${days.map(x => x.slice(0, 3)).join(', ')}</span></div>
    <div><b>${fmtNum(diet.calories)}</b><span>kcal a day</span></div>
    <div><b>${diet.proteinG}<span class="of">g</span></b><span>protein a day</span></div>
  </div>
</header>
<nav class="chips" aria-label="Sections"><a href="#plan/workouts">Workouts</a><a href="#plan/food">Food</a><a href="#plan/rules">Rules</a><a href="#plan/settings">Settings</a></nav>

<p>${esc(plan.splitDescription)} Workouts take turns in order (${plan.workouts.map(w => w.id).join(', ')}), whatever day you show up.${plan.cardioDays.length ? ` Easy cardio on ${plan.cardioDays.map(x => DAY_NAMES[x]).join(' and ')}.` : ''}</p>
${plan.cautions.map(c => `<div class="note warn"><p>${esc(c)}</p></div>`).join('')}
${plan.notes.map(c => `<div class="note"><p>${esc(c)}</p></div>`).join('')}
<div class="actions inline" style="margin-top:6px"><button class="btn quiet small" data-action="reopen_intro">How this works, again</button></div>

<h2 class="h2" id="plan-workouts">Workouts</h2>
${plan.workouts.map(w => workoutBlock(w, units)).join('')}

<h3 class="h3">Every session</h3>
<div class="twocol">
  <div><b>Warm up</b><ul class="cues">${plan.warmup.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul></div>
  <div><b>Cool down</b><ul class="cues">${plan.cooldown.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul></div>
</div>

<h3 class="h3">${esc(plan.fallbackName)}, for travel</h3>
<p class="small muted">${esc(plan.fallbackDescription)} Start it from Today.</p>
${plan.fallback.map(w => workoutBlock(w, units)).join('')}

<h2 class="h2" id="plan-food">Food</h2>
<div class="stats">
  <div><b>${fmtNum(diet.calories)}</b><span>kcal a day, burning about ${fmtNum(diet.tdee)}</span></div>
  <div><b>${diet.proteinG}<span class="of">g</span></b><span>protein, ${diet.proteinPortionTarget} portions</span></div>
  <div><b>${diet.waterL}<span class="of">L</span></b><span>water</span></div>
</div>
${diet.alcoholRule ? `<p class="small" style="margin-top:12px"><b>Alcohol:</b> ${esc(diet.alcoholRule)}</p>` : ''}

<h3 class="h3">A day of eating, ${esc(diet.cuisine)}</h3>
<ol class="meals">${diet.meals.map(m => `<li><span class="meal-when">${esc(m.time)}</span><span class="meal-what">${esc(m.text)}</span><span class="meal-n">${m.protein} g<br><span class="muted">${m.kcal}</span></span></li>`).join('')}</ol>
<p class="small" style="margin-top:12px"><b>${diet.dayTotals.protein} g protein, about ${fmtNum(diet.dayTotals.kcal)} kcal.</b> ${diet.adjustments.map(esc).join(' ')}</p>

<div class="twocol" style="margin-top:18px">
  <div><b>One protein portion is</b><ul class="cues">${diet.proteinPortions.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
  <div><b>Food rules</b><ul class="cues">${diet.rules.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div>

<h2 class="h2" id="plan-rules">How the weight goes up</h2>
<ol class="steps-list">${plan.progression.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
<p><b>If you miss a day:</b> nothing. Next time you're in, you do the next workout in the rotation. No doubling up.</p>

<h2 class="h2" id="plan-settings">Settings</h2>
<div class="logrow"><div class="logl"><b>Your name</b><span>shown on the home screen</span></div><input class="input" style="width:150px" type="text" value="${esc(p?.name || '')}" data-change="name" aria-label="Your name"></div>
<div class="logrow"><div class="logl"><b>Lifting loads</b><span>plates and dumbbells</span></div><div class="seg"><button aria-pressed="${units.load === 'lb'}" data-action="unit" data-scope="load" data-value="lb">lb</button><button aria-pressed="${units.load === 'kg'}" data-action="unit" data-scope="load" data-value="kg">kg</button></div></div>
<div class="logrow"><div class="logl"><b>Bodyweight and waist</b><span>kg and cm, or lb and inches</span></div><div class="seg"><button aria-pressed="${units.body === 'kg'}" data-action="unit" data-scope="body" data-value="kg">kg</button><button aria-pressed="${units.body === 'lb'}" data-action="unit" data-scope="body" data-value="lb">lb</button></div></div>
<div class="logrow"><div class="logl"><b>Appearance</b></div><div class="seg">${['auto', 'light', 'dark'].map(t => `<button aria-pressed="${(d.settings.theme || 'auto') === t}" data-action="theme" data-value="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>

<h3 class="h3">Your data</h3>
<p class="small muted">Everything is on this device only. Export before you change phones or clear the browser.</p>
<div class="actions inline" style="margin-top:8px"><button class="btn quiet small" data-action="export">Export backup</button><button class="btn quiet small" data-action="import">Restore backup</button></div>
<div class="links">
  <button class="link" data-action="redo">Redo the interview (keeps your logs)</button>
  <button class="link" data-action="go_free">Switch to my own routine, no plan (keeps your logs)</button>
  <button class="link warn" data-action="reset">Erase this person's data</button>
</div>`;

  delegate(root, {
    unit: el => store.update(x => { x.settings.units[el.dataset.scope] = el.dataset.value; if (x.profile) x.profile.units = x.settings.units; }),
    theme: el => { store.update(x => { x.settings.theme = el.dataset.value; }); applyTheme(el.dataset.value); },
    export: () => { const blob = new Blob([store.exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gym-plan-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); },
    import: () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json'; inp.onchange = () => inp.files[0]?.text().then(t => { try { store.importJSON(t); } catch (e) { alert(e.message); } }); inp.click(); },
    reopen_intro: () => { store.update(x => { x.settings.sawIntro = false; }); location.hash = '#today'; },
    redo: () => { if (confirm('Redo the interview? Your sessions and daily logs stay; the program and diet get rebuilt from the new answers.')) store.update(x => { x.plan = null; }); },
    go_free: () => { if (!confirm('Drop the program and run your own routine? Every session and log you have stays. You can come back to a plan later.')) return;
      store.update(x => { const old = x.plan; x.previousPlan = old; x.profile = { ...x.profile, daysPerWeek: old.targetPerWeek ?? old.trainingDays.length, proteinG: old.diet.proteinG, mealsPerDay: old.diet.mealsTarget, targetWeightKg: old.diet.weightTargetKg || x.profile.targetWeightKg || null }; const fresh = freePlan(x.profile); fresh.createdAt = old.createdAt; x.plan = fresh; x.settings.sawIntro = true; });
      location.hash = '#today'; },
    reset: () => { if (confirm(`Erase ${p?.name || 'this person'}'s data on this device? Export a backup first if you want to keep it.`) && confirm('Last chance. Erase all sessions, logs and photos for this person?')) store.reset(); },
  });
  bindName(root);
  bindChips(root);
}

// Section chips scroll within the page instead of routing.
function bindChips(root) {
  root.querySelectorAll('.chips a').forEach(a => a.onclick = e => { e.preventDefault(); const id = 'plan-' + a.getAttribute('href').split('/')[1]; document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}

function bindName(root) {
  const inp = root.querySelector('[data-change="name"]');
  if (inp) inp.onchange = () => { const v = inp.value.trim(); if (v) store.update(x => { x.profile = { ...x.profile, name: v }; }); };
}

function workoutBlock(w, units) {
  return `<section class="wo"><div class="wo-head"><span class="tag big">${esc(w.id)}</span><div><b>${esc(w.focus || w.name)}</b><span class="small muted">${w.exercises.length} exercises</span></div></div>
<ul class="rows tight">${w.exercises.map(e => `<li class="row"><a class="row-head link-row" style="grid-template-columns:1fr auto" href="#exercise/${e.exerciseId}"><span><span class="row-title">${esc(e.name)}</span><br><span class="row-sub">${esc(setsText(e))}</span></span><span class="row-meta">${e.startLoadLb != null ? esc(loadShort(e.startLoadLb, units, e.loadType)) : ''}</span></a></li>`).join('')}</ul></section>`;
}

// ── Self-driven mode: targets, the exercise library, settings ──

const PATTERN_NAMES = { squat: 'Squats', hinge: 'Deadlifts and hinges', horizontal_push: 'Chest presses', vertical_push: 'Shoulder presses', vertical_pull: 'Pull-ups and pulldowns', horizontal_pull: 'Rows', lunge: 'Lunges', knee_flexion: 'Hamstrings', knee_extension: 'Quads', elbow_flexion: 'Biceps', elbow_extension: 'Triceps', rear_delt: 'Rear shoulders', core_static: 'Core, holds', core_dynamic: 'Core, reps', grip: 'Grip and carries' };

function renderFree(root, ctx) {
  const d = ctx.doc, plan = d.plan, p = d.profile, units = d.settings.units, diet = plan.diet;
  const groups = {};
  Object.entries(EXERCISES).forEach(([id, e]) => { (groups[e.pattern] ||= []).push({ id, name: e.name }); });
  const customs = Object.entries(d.customExercises || {});
  root.innerHTML = `
<header class="hero floor">
  <div class="hero-date">${p?.name ? esc(p.name) + "'s routine" : 'Your routine'}</div>
  <div class="display-words">Your own routine</div>
  <div class="stats on-floor">
    <div><b>${plan.targetPerWeek}</b><span>workouts a week</span></div>
    <div><b>${diet.proteinG}<span class="of">g</span></b><span>protein a day</span></div>
    <div><b>${Object.keys(d.customExercises || {}).length + Object.keys(EXERCISES).length}</b><span>exercises to pick from</span></div>
  </div>
</header>
<p>No program here. You log what you do; these are the targets the Week tab counts against.</p>

<h2 class="h2">Targets</h2>
<div class="signal"><div><div class="lbl">Workouts a week</div></div><div class="seg">${[2, 3, 4, 5, 6].map(n => `<button aria-pressed="${plan.targetPerWeek === n}" data-action="target_days" data-value="${n}">${n}</button>`).join('')}</div></div>
<div class="signal"><div><div class="lbl">Protein a day</div><div class="sub">About ${diet.proteinPortionTarget} portions of 25 g.</div></div><input class="input" style="width:110px;text-align:right" type="number" inputmode="numeric" value="${diet.proteinG}" data-change="protein" aria-label="Protein grams"></div>
<div class="signal"><div><div class="lbl">Meals a day</div></div><div class="seg">${[2, 3, 4, 5].map(n => `<button aria-pressed="${diet.mealsTarget === n}" data-action="target_meals" data-value="${n}">${n}</button>`).join('')}</div></div>
<div class="signal"><div><div class="lbl">Weight goal</div><div class="sub">Optional, ${units.body}. Shows on the Progress tab.</div></div><input class="input" style="width:110px;text-align:right" type="number" inputmode="decimal" step="0.1" value="${diet.weightTargetKg ? (units.body === 'lb' ? fmtNum(diet.weightTargetKg * 2.2046, 1) : fmtNum(diet.weightTargetKg, 1)) : ''}" data-change="goal" aria-label="Weight goal"></div>

<h3 class="h3" style="margin-top:24px">What counts as one protein portion</h3>
<ul class="cues">${diet.proteinPortions.map(x => `<li>${esc(x)}</li>`).join('')}</ul>

<h2 class="h2">Exercise library</h2>
<p class="small muted" style="margin-top:-4px">Tap one for a video, how to do it, and where to note its place in your gym. Anything you add by name during a workout appears under "Yours".</p>
${customs.length ? `<h3 class="h3">Yours</h3><ul class="rows">${customs.map(([id, c]) => `<li class="row"><div class="row-head" style="grid-template-columns:1fr auto"><span class="row-title">${esc(c.name)}</span><button class="link" data-action="del_custom" data-id="${id}">remove</button></div></li>`).join('')}</ul>` : ''}
${Object.keys(PATTERN_NAMES).map(k => groups[k] ? `<h3 class="h3">${PATTERN_NAMES[k]}</h3><ul class="rows">${groups[k].map(x => `<li class="row"><a class="row-head link-row" style="grid-template-columns:1fr auto" href="#exercise/${x.id}"><span class="row-title">${esc(x.name)}</span><span class="row-meta chev" aria-hidden="true">▸</span></a></li>`).join('')}</ul>` : '').join('')}

<h2 class="h2">Settings</h2>
<div class="signal"><div><div class="lbl">Your name</div><div class="sub">Shown on the home screen.</div></div><input class="input" style="width:150px" type="text" value="${esc(p?.name || '')}" data-change="name" aria-label="Your name"></div>
<div class="signal"><div><div class="lbl">Lifting loads</div></div><div class="seg"><button aria-pressed="${units.load === 'lb'}" data-action="unit" data-scope="load" data-value="lb">lb</button><button aria-pressed="${units.load === 'kg'}" data-action="unit" data-scope="load" data-value="kg">kg</button></div></div>
<div class="signal"><div><div class="lbl">Bodyweight and waist</div></div><div class="seg"><button aria-pressed="${units.body === 'kg'}" data-action="unit" data-scope="body" data-value="kg">kg</button><button aria-pressed="${units.body === 'lb'}" data-action="unit" data-scope="body" data-value="lb">lb</button></div></div>
<div class="signal"><div><div class="lbl">Appearance</div></div><div class="seg">${['auto', 'light', 'dark'].map(t => `<button aria-pressed="${(d.settings.theme || 'auto') === t}" data-action="theme" data-value="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div></div>

<h2 class="h2">People</h2>
<div class="actions inline" style="margin-top:8px"><button class="btn quiet" data-action="switch">Home: switch person or add someone</button></div>

<h2 class="h2">Your data</h2>
<p class="small muted">Everything is on this device only. Export before you change phones or clear the browser.</p>
<div class="actions inline"><button class="btn quiet" data-action="export">Export backup</button><button class="btn quiet" data-action="import">Restore backup</button></div>
<div class="actions inline" style="margin-top:0"><button class="link" data-action="want_plan">${d.previousPlan ? 'Go back to my program' : 'Actually, build me a plan'}</button><button class="link warn" data-action="reset">Erase this person's data</button></div>`;

  const retarget = patch => store.update(x => { x.profile = { ...x.profile, ...patch }; const fresh = freePlan(x.profile); fresh.createdAt = x.plan.createdAt; x.plan = fresh; });
  delegate(root, {
    target_days: el => retarget({ daysPerWeek: Number(el.dataset.value) }),
    target_meals: el => retarget({ mealsPerDay: Number(el.dataset.value) }),
    del_custom: el => { if (confirm('Remove this exercise from your list? Logged sets stay in your history.')) store.update(x => { delete x.customExercises[el.dataset.id]; }); },
    unit: el => store.update(x => { x.settings.units[el.dataset.scope] = el.dataset.value; if (x.profile) x.profile.units = x.settings.units; }),
    theme: el => { store.update(x => { x.settings.theme = el.dataset.value; }); applyTheme(el.dataset.value); },
    switch: () => { store.leavePerson(); location.hash = '#today'; },
    want_plan: () => {
      const prev = d.previousPlan;
      if (prev && confirm('Go back to the program you had before? Your logs stay. Cancel to run the interview instead.')) { store.update(x => { x.plan = prev; x.previousPlan = null; }); location.hash = '#today'; return; }
      if (confirm('Run the interview and get a program? Your logs stay.')) store.update(x => { x.plan = null; x.settings.sawIntro = false; }); },
    export: () => { const blob = new Blob([store.exportJSON()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gym-plan-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); },
    import: () => { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json'; inp.onchange = () => inp.files[0]?.text().then(t => { try { store.importJSON(t); } catch (e) { alert(e.message); } }); inp.click(); },
    reset: () => { if (confirm(`Erase ${p?.name || 'this person'}'s data on this device? Export a backup first if you want to keep it.`) && confirm('Last chance. Erase all sessions, logs and photos for this person?')) store.reset(); },
  });
  bindName(root);
  root.querySelector('[data-change="protein"]').onchange = e => retarget({ proteinG: Number(e.target.value) || null });
  root.querySelector('[data-change="goal"]').onchange = e => { const n = Number(e.target.value); retarget({ targetWeightKg: n ? (units.body === 'lb' ? n / 2.2046 : n) : null }); };
}
