// The interview, as screens. Ends by generating the plan and saving it.

import { INTAKE_STEPS, RED_FLAGS, DAY_SHORT } from '../data/intake.js';
import { PROFILES } from '../data/profiles.js';
import { generatePlan, freePlan, checkRedFlags } from '../generator.js';
import * as store from '../store.js';
import { esc, delegate } from './ui.js';
import { lbToKg, kgToLb, fmtNum } from '../util.js';

const state = { screen: 'welcome', step: 0, a: { units: { load: 'lb', body: 'kg' }, heightUnit: 'cm' }, error: null };

export function renderOnboarding(root, ctx) {
  const s = state;
  const m = /^#setup\/([a-z0-9_-]+)$/i.exec(location.hash || '');
  if (m && PROFILES[m[1]]) {
    // Already on this phone: continue as them rather than making a twin.
    const have = store.people().find(pp => pp.name === PROFILES[m[1]].name);
    location.hash = '#today';
    if (have) { store.switchPerson(have.id); ctx.done(); } else finish({ ...PROFILES[m[1]], presetId: m[1] }, ctx);
    return; }
  if (s.screen === 'welcome') root.innerHTML = welcome();
  else if (s.screen === 'free') root.innerHTML = freeSetup();
  else if (s.screen === 'blocked') root.innerHTML = blocked();
  else if (s.screen === 'review') root.innerHTML = review();
  else root.innerHTML = step();

  delegate(root, {
    start: () => { s.screen = 'step'; s.step = 0; s.error = null; s.a = { units: { load: 'lb', body: 'kg' }, heightUnit: 'cm' }; rerender(root, ctx, { top: true }); },
    continue: el => { store.switchPerson(el.dataset.id); ctx.done(); },
    resume: () => { s.screen = 'step'; s.error = null; rerender(root, ctx, { top: true }); },
    free: () => { s.screen = 'free'; s.error = null; s.f = s.f || { units: { load: 'lb', body: 'kg' }, daysPerWeek: 3, dietType: 'nonveg' }; rerender(root, ctx, { top: true }); },
    free_choose: el => { s.f[el.dataset.key] = el.dataset.value; rerender(root, ctx); },
    free_unit: el => { const [scope, val] = el.dataset.value.split(':'); s.f.units[scope] = val; rerender(root, ctx); },
    free_build: () => {
      const f = s.f;
      if (!f.name || !f.name.trim()) { s.error = 'Fill in your name.'; rerender(root, ctx); return; }
      f.name = f.name.trim().slice(0, 40);
      if (f.weightKg != null && (f.weightKg < 30 || f.weightKg > 250)) { s.error = f.units.body === 'lb' ? 'Weight should be between 66 and 551 lb, or leave it blank.' : 'Weight should be between 30 and 250 kg, or leave it blank.'; rerender(root, ctx); return; }
      if (f.proteinG != null && (f.proteinG < 40 || f.proteinG > 400)) { s.error = 'Protein target should be between 40 and 400 g, or leave it blank.'; rerender(root, ctx); return; }
      const profile = { name: f.name, units: f.units, weightKg: f.weightKg || null, daysPerWeek: Number(f.daysPerWeek) || 3, proteinG: f.proteinG || null, dietType: f.dietType, tone: 'plain' };
      const plan = freePlan(profile);
      store.update(d => { d.profile = profile; d.plan = plan; d.settings.units = f.units; d.settings.sawIntro = true; });
      s.screen = 'welcome'; s.f = null; ctx.done();
    },
    home: () => { s.screen = 'welcome'; s.error = null; rerender(root, ctx, { top: true }); },
    edit_step: el => { s.screen = 'step'; s.step = Number(el.dataset.i); s.error = null; rerender(root, ctx, { top: true }); },
    load_profile: el => { finish({ ...PROFILES[el.dataset.id], presetId: el.dataset.id }, ctx); },
    import: () => pickFile(text => { try { store.importJSON(text); } catch (e) { alert(e.message); } }),
    back: () => { if (s.screen === 'review') { s.screen = 'step'; s.step = INTAKE_STEPS.length - 1; } else if (s.screen === 'blocked') { s.screen = 'step'; } else if (s.step === 0) { s.screen = 'welcome'; } else { s.step--; } s.error = null; rerender(root, ctx, { top: true }); },
    next: () => {
      const stepDef = INTAKE_STEPS[s.step];
      const err = validate(stepDef, s.a); if (err) { s.error = err; rerender(root, ctx); root.querySelector('.error')?.scrollIntoView({ block: 'center' }); return; }
      s.error = null;
      if (stepDef.id === 'health' && checkRedFlags(s.a).length) { s.screen = 'blocked'; rerender(root, ctx, { top: true }); return; }
      if (s.step === INTAKE_STEPS.length - 1) { s.screen = 'review'; } else { s.step++; }
      rerender(root, ctx, { top: true });
    },
    choose: el => { s.a[el.dataset.key] = coerce(el.dataset.value); rerender(root, ctx); },
    multi: el => { const k = el.dataset.key; const set = new Set(s.a[k] || []); set.has(el.dataset.value) ? set.delete(el.dataset.value) : set.add(el.dataset.value); s.a[k] = [...set]; rerender(root, ctx); },
    yesno: el => { s.a[el.dataset.key] = el.dataset.value === 'yes'; rerender(root, ctx); },
    day: el => { const k = el.dataset.key; const set = new Set(s.a[k] || []); const d = Number(el.dataset.value); set.has(d) ? set.delete(d) : set.add(d); s.a[k] = [...set].sort(); rerender(root, ctx); },
    unit: el => { const [scope, val] = el.dataset.value.split(':'); if (scope === 'height') s.a.heightUnit = val; else s.a.units[scope] = val; rerender(root, ctx); },
    build: () => finish(s.a, ctx),
    field: el => {}, // no-op for inputs
  });
  root.querySelectorAll('[data-field]').forEach(inp => {
    inp.oninput = () => { setField(inp.dataset.field, inp.value); };
  });
  root.querySelectorAll('[data-ffield]').forEach(inp => {
    inp.oninput = () => { const k = inp.dataset.ffield, v = inp.value; const f = state.f;
      if (k === 'weight') { const n = Number(v); f.weightKg = n ? (f.units.body === 'lb' ? lbToKg(n) : n) : null; }
      else if (k === 'proteinG') f.proteinG = Number(v) || null;
      else f[k] = v; };
  });
}

// Re-draw in place. Only a change of screen or part goes back to the top;
// picking an answer keeps you where you were.
function rerender(root, ctx, { top = false } = {}) {
  const y = window.scrollY;
  renderOnboarding(root, ctx);
  if (top) window.scrollTo(0, 0); else window.scrollTo(0, y);
}

function setField(key, value) {
  const a = state.a;
  if (key === 'heightCm') a.heightCm = Number(value) || null;
  else if (key === 'heightFt') { a._ft = Number(value) || 0; a.heightCm = Math.round((a._ft * 12 + (a._in || 0)) * 2.54); }
  else if (key === 'heightIn') { a._in = Number(value) || 0; a.heightCm = Math.round(((a._ft || 0) * 12 + a._in) * 2.54); }
  else if (key === 'weightKg' || key === 'targetWeightKg') { const n = Number(value); a[key] = n ? (a.units.body === 'lb' ? lbToKg(n) : n) : null; }
  else if (key === 'dumbbellMax') { const n = Number(value); a.dumbbellMax = n ? { [a.units.load]: n } : null; }
  else a[key] = value === '' ? null : (isNaN(Number(value)) ? value : Number(value));
}

function coerce(v) { return v; }

function validate(stepDef, a) {
  for (const f of stepDef.fields) {
    const v = a[f.key];
    const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
    if (f.required) {
      if (f.type === 'yesno' && typeof v !== 'boolean') return `Answer "${f.label}".`;
      if (f.type === 'days' && empty) return 'Pick at least one day.';
      if (f.type !== 'yesno' && f.type !== 'days' && empty) return `Fill in "${f.label}".`;
    }
    if (f.type === 'days' && !empty && f.min && v.length < f.min) return v.length === 1 ? 'One lifting day a week will not get you anywhere. Pick at least two.' : `Pick at least ${f.min} days.`;
    if (f.type === 'days' && !empty && f.max && v.length > f.max) return `${v.length} lifting days a week is not something this app will program. Rest days are where muscle grows. Pick ${f.max} at most.`;
    if (empty) continue;
    if ((f.type === 'text' || f.type === 'textarea') && String(v).trim().length === 0) return `"${f.label}" is only spaces.`;
    if ((f.type === 'text' || f.type === 'textarea') && f.maxLength && String(v).length > f.maxLength) return `"${f.label}" is too long. Keep it under ${f.maxLength} characters.`;
    if (f.type === 'number' && (Number.isNaN(Number(v)) || v < f.min || v > f.max)) return `"${f.label}" should be a number between ${f.min} and ${f.max}.`;
    if (f.type === 'height' && (v < f.min || v > f.max)) return a.heightUnit === 'ft' ? `Height should be between ${Math.floor(f.min / 30.48)} ft and ${Math.floor(f.max / 30.48)} ft ${Math.round(f.max / 2.54 % 12)} in.` : `Height should be between ${f.min} and ${f.max} cm.`;
    if (f.type === 'weight' && (v < f.min || v > f.max)) return a.units.body === 'lb' ? `"${f.label}" should be between ${Math.round(kgToLb(f.min))} and ${Math.round(kgToLb(f.max))} lb.` : `"${f.label}" should be between ${f.min} and ${f.max} kg.`;
    if (f.type === 'load') { const n = v[a.units.load]; const lo = a.units.load === 'kg' ? Math.round(lbToKg(f.min)) : f.min, hi = a.units.load === 'kg' ? Math.round(lbToKg(f.max)) : f.max; if (n != null && (n < lo || n > hi)) return `"${f.label}" should be between ${lo} and ${hi} ${a.units.load}.`; }
  }
  return null;
}

function finish(answers, ctx) {
  const profile = { ...answers };
  delete profile._ft; delete profile._in; delete profile.heightUnit;
  if (typeof profile.name === 'string') profile.name = profile.name.trim().slice(0, 40);
  if (Array.isArray(profile.trainingDays)) profile.daysPerWeek = profile.trainingDays.length;
  const plan = generatePlan(profile);
  if (plan.blocked) { state.screen = 'blocked'; state.a = answers; return; }
  store.update(d => { d.profile = profile; d.plan = plan; d.settings.units = profile.units || d.settings.units; });
  state.screen = 'welcome';
  ctx.done();
}

function pickFile(cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(cb); };
  inp.click();
}

// ── Screens ─────────────────────────────────────────────────────

const CHEV = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function hasProgress() { const a = state.a; return Object.keys(a).some(k => !['units', 'heightUnit'].includes(k) && a[k] != null && a[k] !== ''); }

function welcome() {
  const existing = store.people();
  return `
<header class="hero floor">
  <div class="hero-date">Gym plan</div>
  <h1 class="display" style="font-size:clamp(56px,16vw,96px)">Show up.<br>Log it.</h1>
  <p class="sub">A program built for your gym, your goal and your kitchen. Or no program, just the log. Everything stays on this phone.</p>
</header>
${existing.length ? `<h2 class="h3" style="margin-top:4px">On this phone</h2>
<ul class="people">${existing.map(pp => `<li><button data-action="continue" data-id="${pp.id}"><span class="tag big">${esc(pp.name.trim()[0] || '?').toUpperCase()}</span><span class="who"><b>${esc(pp.name)}</b><span>${pp.sessions} workout${pp.sessions === 1 ? '' : 's'} logged</span></span><span class="go">Continue</span></button></li>`).join('')}</ul>` : ''}
<h2 class="h3" style="margin-top:${existing.length ? 28 : 4}px">${existing.length ? 'Someone new' : 'Start'}</h2>
${hasProgress() ? `<div class="actions" style="margin-top:8px"><button class="btn primary block" data-action="resume">Continue the interview, part ${Math.min(state.step, INTAKE_STEPS.length - 1) + 1} of ${INTAKE_STEPS.length}</button><button class="link" data-action="start">Start the interview over</button></div>` : ''}
<div class="doors">
  <button class="door" data-action="${hasProgress() ? 'resume' : 'start'}"><b>Build me a plan</b><span>The trainer's interview, eight short parts. You get a program, a diet and a checklist for every session.</span></button>
  <button class="door" data-action="free"><b>I'll run my own</b><span>No plan. Log whatever you do, track food, weight and progress. Four questions to set up.</span></button>
</div>
<details class="fold"><summary>What the interview asks</summary>
<ol class="steps">${INTAKE_STEPS.map(s => `<li><span>${esc(s.title)}</span><span class="muted small">${s.fields.length} question${s.fields.length === 1 ? '' : 's'}</span></li>`).join('')}</ol>
</details>
<p style="margin-top:22px"><button class="link" data-action="import">Restore from a backup file</button></p>`;
}

function freeSetup() {
  const f = state.f, u = f.units;
  const shownW = f.weightKg == null ? '' : (u.body === 'lb' ? fmtNum(kgToLb(f.weightKg), 1) : fmtNum(f.weightKg, 1));
  const suggested = f.weightKg ? Math.ceil((f.weightKg * 1.6) / 5) * 5 : null;
  return `
<header class="hero floor">
  <div class="topbar on-floor"><button class="back" data-action="home">${CHEV}Home</button><span class="hero-date">Your own routine</span></div>
  <div class="display-words">Four things</div>
  <p class="sub">Enough to count your week and set a protein target. Change any of it later in the Plan tab.</p>
</header>
<div class="field"><label for="fname">Your name</label><input class="input" id="fname" data-ffield="name" value="${esc(f.name ?? '')}" autocomplete="off" maxlength="40"></div>
<div class="field"><label for="fw">Current weight</label><div class="inline-units"><input class="input" type="number" inputmode="decimal" id="fw" data-ffield="weight" value="${shownW}">
  <div class="seg"><button type="button" aria-pressed="${u.body === 'kg'}" data-action="free_unit" data-value="body:kg">kg</button><button type="button" aria-pressed="${u.body === 'lb'}" data-action="free_unit" data-value="body:lb">lb</button></div></div>
  <p class="help">Optional. Used to suggest a protein target and to start your weight chart.</p></div>
<div class="field"><div class="lab">Training days a week you're aiming for</div><div class="seg">${[2, 3, 4, 5, 6].map(n => `<button type="button" aria-pressed="${Number(f.daysPerWeek) === n}" data-action="free_choose" data-key="daysPerWeek" data-value="${n}">${n}</button>`).join('')}</div></div>
<div class="field"><label for="fp">Protein target, grams a day</label><input class="input" type="number" inputmode="numeric" id="fp" data-ffield="proteinG" value="${f.proteinG ?? ''}" placeholder="${suggested ? suggested + ' suggested' : 'for example 120'}"><p class="help">Leave it blank and the app uses 1.6 g per kg of bodyweight.</p></div>
<div class="field"><div class="lab">What do you eat?</div><div class="choices">${[['nonveg', 'Meat, fish and eggs'], ['egg', 'Eggs and dairy, no meat'], ['veg', 'Vegetarian']].map(([v, l]) => `<button type="button" class="choice" role="radio" aria-checked="${f.dietType === v}" data-action="free_choose" data-key="dietType" data-value="${v}"><span class="dot"></span><span>${l}</span></button>`).join('')}</div><p class="help">Only decides which foods count as a protein portion.</p></div>
<div class="field"><div class="lab">Weights shown in</div><div class="seg"><button type="button" aria-pressed="${u.load === 'lb'}" data-action="free_unit" data-value="load:lb">lb</button><button type="button" aria-pressed="${u.load === 'kg'}" data-action="free_unit" data-value="load:kg">kg</button></div></div>
${state.error ? `<p class="error" role="alert">${esc(state.error)}</p>` : ''}
<div class="actions"><button class="btn primary block" data-action="free_build">Start logging</button></div>`;
}

function blocked() {
  const flags = RED_FLAGS.filter(f => f.test(state.a)).map(f => f.text);
  return `
<header class="hero floor">
  <div class="topbar on-floor"><button class="back" data-action="back">${CHEV}Back</button><span class="hero-date">Health screening</span></div>
  <div class="display-words">See a person first</div>
  <p class="sub">This app builds programs for healthy beginners. One of your answers needs a doctor or a human trainer before a barbell.</p>
</header>
${flags.map(t => `<div class="note warn"><p>${esc(t)}</p></div>`).join('')}
<p class="small muted">Use Back to change an answer, or Home to leave.</p>
<div class="topbar"><span></span><button class="back" data-action="home">Home</button></div>`;
}

function step() {
  const i = state.step, def = INTAKE_STEPS[i], a = state.a, n = INTAKE_STEPS.length;
  return `
<header class="hero floor">
  <div class="topbar on-floor"><button class="back" data-action="back">${CHEV}Back</button><span class="hero-date">Part ${i + 1} of ${n}</span></div>
  <div class="display-words">${esc(def.title)}</div>
  <p class="sub">${esc(def.intro)}</p>
  <div class="stack" aria-hidden="true">${INTAKE_STEPS.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
</header>
<div class="topbar" style="margin-top:-6px"><span class="small muted">${def.fields.filter(f => f.required).length} required</span><button class="back" data-action="home">Home</button></div>
${def.fields.map(f => field(f, a)).join('')}
${state.error ? `<p class="error" role="alert">${esc(state.error)}</p>` : ''}
<div class="actions">
  <button class="btn primary block" data-action="next">${i === n - 1 ? 'Review my answers' : 'Next: ' + esc(INTAKE_STEPS[i + 1].title)}</button>
</div>`;
}

function field(f, a) {
  const v = a[f.key];
  const id = 'f_' + f.key;
  switch (f.type) {
    case 'text': return `<div class="field"><label for="${id}">${esc(f.label)}</label><input class="input" id="${id}" data-field="${f.key}" value="${esc(v ?? '')}" autocomplete="off" ${f.maxLength ? `maxlength="${f.maxLength}"` : ''}></div>`;
    case 'textarea': return `<div class="field"><label for="${id}">${esc(f.label)}</label><textarea class="input" id="${id}" data-field="${f.key}" ${f.maxLength ? `maxlength="${f.maxLength}"` : ''}>${esc(v ?? '')}</textarea></div>`;
    case 'number': return `<div class="field"><label for="${id}">${esc(f.label)}</label><input class="input" type="number" inputmode="decimal" id="${id}" data-field="${f.key}" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${v ?? ''}"></div>`;
    case 'choice': return `<div class="field"><div class="lab">${esc(f.label)}</div><div class="choices" role="radiogroup">${f.options.map(([val, lab]) => `<button type="button" class="choice" role="radio" aria-checked="${String(v) === val}" data-action="choose" data-key="${f.key}" data-value="${val}"><span class="dot"></span><span>${esc(lab)}</span></button>`).join('')}</div></div>`;
    case 'multi': return `<div class="field"><div class="lab">${esc(f.label)}</div><div class="choices">${f.options.map(([val, lab]) => `<button type="button" class="choice sq" aria-pressed="${(v || []).includes(val)}" data-action="multi" data-key="${f.key}" data-value="${val}"><span class="dot"></span><span>${esc(lab)}</span></button>`).join('')}</div><p class="help">Leave all unticked if none apply.</p></div>`;
    case 'yesno': return `<div class="field"><div class="lab">${esc(f.label)}</div><div class="seg">${[['yes', 'Yes'], ['no', 'No']].map(([val, lab]) => `<button type="button" aria-pressed="${v === (val === 'yes')}" data-action="yesno" data-key="${f.key}" data-value="${val}">${lab}</button>`).join('')}</div></div>`;
    case 'days': return `<div class="field"><div class="lab">${esc(f.label)}${v && v.length ? ` <span class="muted" style="font-weight:400">${v.length} a week</span>` : ''}</div><div class="days">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button type="button" aria-pressed="${(v || []).includes(d)}" data-action="day" data-key="${f.key}" data-value="${d}">${DAY_SHORT[d]}</button>`).join('')}</div>${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
    case 'height': return `<div class="field"><div class="lab">${esc(f.label)}</div><div class="inline-units">${a.heightUnit === 'ft'
      ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><input class="input" type="number" inputmode="numeric" placeholder="ft" data-field="heightFt" value="${a._ft ?? (a.heightCm ? Math.floor(a.heightCm / 2.54 / 12) : '')}" aria-label="feet"><input class="input" type="number" inputmode="numeric" placeholder="in" data-field="heightIn" value="${a._in ?? (a.heightCm ? Math.round(a.heightCm / 2.54 % 12) : '')}" aria-label="inches"></div>`
      : `<input class="input" type="number" inputmode="numeric" placeholder="cm" data-field="heightCm" value="${a.heightCm ?? ''}" aria-label="centimetres">`}
      <div class="seg"><button type="button" aria-pressed="${a.heightUnit !== 'ft'}" data-action="unit" data-value="height:cm">cm</button><button type="button" aria-pressed="${a.heightUnit === 'ft'}" data-action="unit" data-value="height:ft">ft</button></div></div></div>`;
    case 'weight': { const shown = v == null ? '' : (a.units.body === 'lb' ? fmtNum(kgToLb(v), 1) : fmtNum(v, 1));
      return `<div class="field"><label for="${id}">${esc(f.label)}</label><div class="inline-units"><input class="input" type="number" inputmode="decimal" id="${id}" data-field="${f.key}" value="${shown}">
      <div class="seg"><button type="button" aria-pressed="${a.units.body === 'kg'}" data-action="unit" data-value="body:kg">kg</button><button type="button" aria-pressed="${a.units.body === 'lb'}" data-action="unit" data-value="body:lb">lb</button></div></div></div>`; }
    case 'load': { const shown = v ? (v[a.units.load] ?? (a.units.load === 'kg' ? fmtNum(lbToKg(v.lb), 1) : fmtNum(kgToLb(v.kg), 0))) : '';
      return `<div class="field"><label for="${id}">${esc(f.label)}</label><div class="inline-units"><input class="input" type="number" inputmode="decimal" id="${id}" data-field="${f.key}" value="${shown}">
      <div class="seg"><button type="button" aria-pressed="${a.units.load === 'lb'}" data-action="unit" data-value="load:lb">lb</button><button type="button" aria-pressed="${a.units.load === 'kg'}" data-action="unit" data-value="load:kg">kg</button></div></div><p class="help">This also sets the unit the app shows for every lift. You can change it later.</p></div>`; }
    default: return '';
  }
}

function review() {
  const a = state.a;
  const groups = INTAKE_STEPS.map((st, i) => ({ i, title: st.title, rows: st.fields.map(f => { const v = a[f.key]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return null; return [f.label, show(f, v, a)]; }).filter(Boolean) })).filter(g => g.rows.length);
  return `
<header class="hero floor">
  <div class="topbar on-floor"><button class="back" data-action="back">${CHEV}Back</button><span class="hero-date">Review</span></div>
  <div class="display-words">Your answers</div>
  <p class="sub">Change anything with Edit. When it is right, the plan gets built from this.</p>
</header>
${groups.map(g => `<div class="topbar" style="margin:18px 0 4px"><b>${esc(g.title)}</b><button class="back" data-action="edit_step" data-i="${g.i}">Edit</button></div>
<ul class="cmp">${g.rows.map(([k, v]) => `<li style="grid-template-columns:1fr auto"><span class="muted">${esc(k)}</span><span><b>${esc(v)}</b></span></li>`).join('')}</ul>`).join('')}
<div class="actions"><button class="btn primary block" data-action="build">Build my plan</button></div>
<div class="topbar"><span></span><button class="back" data-action="home">Home</button></div>`;
}

function show(f, v, a) {
  if (f.type === 'yesno') return v ? 'Yes' : 'No';
  if (f.type === 'choice') return (f.options.find(o => o[0] === String(v)) || [])[1] || v;
  if (f.type === 'multi') return v.map(x => (f.options.find(o => o[0] === x) || [])[1] || x).join(', ');
  if (f.type === 'days') return v.map(d => DAY_SHORT[d]).join(', ');
  if (f.type === 'height') return `${v} cm`;
  if (f.type === 'weight') return a.units.body === 'lb' ? `${fmtNum(kgToLb(v), 1)} lb` : `${fmtNum(v, 1)} kg`;
  if (f.type === 'load') return `${v[a.units.load] ?? ''} ${a.units.load}`;
  return String(v);
}
