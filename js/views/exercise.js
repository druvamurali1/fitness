// One exercise, explained: what it is, where it is in your gym, a video, the
// setup, the movement, what it should feel like, the usual mistakes, and what
// the plan asks of you.

import { HOWTO, setsText } from '../data/howto.js';
import { VIDEOS } from '../data/videos.js';
import { EXERCISES } from '../data/exercises.js';
import * as store from '../store.js';
import { esc, delegate } from './ui.js';
import { startText, loadShort } from './words.js';
import { fmtNum, fmtShort } from '../util.js';
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
  const hist = store.exerciseHistory(id).filter(h => h.sets.some(x => x.done && x.reps > 0)).slice(-4).reverse();
  root.innerHTML = `
<header class="hero floor">
  <div class="topbar on-floor"><a class="back" href="#today">${CHEV}Back</a><span class="hero-date">${inPlan ? 'In workout ' + esc(inPlan.workout.id) : 'Exercise'}</span></div>
  <div class="display-words">${esc(ex.name)}</div>
  ${inPlan ? `<div class="stats on-floor">
    <div><b>${inPlan.sets}${inPlan.repMin != null ? ` × ${inPlan.repMin}–${inPlan.repMax}` : ''}</b><span>${inPlan.repMin != null ? `sets × ${inPlan.measure === 'seconds' ? 'seconds' : 'reps'}` : 'sets'}</span></div>
    <div><b class="${inPlan.startLoadLb != null && !/^\d/.test(loadShort(inPlan.startLoadLb, units, inPlan.loadType).replace(/^pin /, '')) ? 'txt' : ''}">${inPlan.startLoadLb != null ? esc(loadShort(inPlan.startLoadLb, units, inPlan.loadType).replace(/^pin /, '').replace(/ each$/, '')) : 'body'}</b><span>${inPlan.startLoadLb != null ? (inPlan.loadType === 'stack' ? 'pin, to start' : inPlan.loadType === 'dumbbell' ? 'each hand, to start' : 'to start') : 'weight'}</span></div>
    <div><b>${inPlan.restSeconds >= 60 ? fmtNum(inPlan.restSeconds / 60, 1) : inPlan.restSeconds}<span class="of">${inPlan.restSeconds >= 60 ? 'min' : 's'}</span></b><span>rest between sets</span></div>
  </div>` : ''}
</header>
<p class="lede">${esc(how.what)}</p>
${v ? video(v) : `<div class="empty">No video linked yet for this one. The steps below are enough to start with light weight.</div>`}

<h2 class="h3">Where it is in your gym</h2>
${photo ? `<img class="gym-photo" src="${photo}" alt="Your photo of this equipment">` : ''}
${editing ? `<div class="field" style="margin-top:6px"><label for="wherenote">Describe it so you find it next time</label><textarea class="input" id="wherenote" data-field="where" placeholder="${esc(equipmentFallback(key))} For example: the grey machine by the stairs, second from the left.">${esc(d.profile?.equipmentNotes?.[key] || '')}</textarea></div>
<div class="actions inline" style="margin-top:0"><button class="btn small" data-action="save_where">Save</button><label class="btn quiet small" style="cursor:pointer">${photo ? 'Replace photo' : 'Add a photo'}<input type="file" accept="image/*" capture="environment" hidden data-change="gymphoto"></label>${photo ? `<button class="link" data-action="del_photo">Remove photo</button>` : ''}<button class="link" data-action="cancel_where">Cancel</button></div>`
: `<p>${esc(where || equipmentFallback(key))}</p><button class="link" data-action="edit_where">${where && d.profile?.equipmentNotes?.[key] ? 'Edit this note or photo' : 'Add a note or a photo of where it is'}</button>`}

<h2 class="h3">Set it up</h2>
<ol class="steps-list">${how.setup.map(x => `<li>${esc(x)}</li>`).join('')}</ol>

<h2 class="h3">Do it</h2>
<ol class="steps-list">${how.how.map(x => `<li>${esc(x)}</li>`).join('')}</ol>

<div class="twocol">
  <div><b>It should feel like</b><p style="margin-top:4px">${esc(how.feel)}</p></div>
  <div><b>Watch out for</b><ul class="cues">${how.mistakes.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
</div>

<details class="fold"><summary>Short cues to remember</summary><ul class="cues">${ex.cues.map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>

${hist.length ? `<h2 class="h3" style="margin-top:26px">Your last ${hist.length === 1 ? 'time' : hist.length + ' times'}</h2>
<ul class="cmp">${hist.map(h => `<li><span>${fmtShort(h.date)}</span><span class="muted">${h.weightLb ? esc(loadText(h.weightLb, units, ex.loadType)) : 'bodyweight'}</span><span><b>${h.sets.filter(x => x.done && x.reps > 0).map(x => x.reps).join(', ')}</b> ${ex.loadType === 'time' ? 's' : 'reps'}</span></li>`).join('')}</ul>` : ''}`;

  delegate(root, {
    edit_where: () => { ui.editing = key; renderExercise(root, ctx, id); },
    cancel_where: () => { ui.editing = null; renderExercise(root, ctx, id); },
    save_where: () => { const text = root.querySelector('[data-field="where"]').value.trim(); ui.editing = null; store.update(x => { x.profile ||= {}; x.profile.equipmentNotes ||= {}; if (text) x.profile.equipmentNotes[key] = text; else delete x.profile.equipmentNotes[key]; }); },
    del_photo: () => { store.update(x => { if (x.equipmentPhotos) delete x.equipmentPhotos[key]; }); },
    play: el => { const wrap = el.closest('.video'); wrap.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?autoplay=1&rel=0&modestbranding=1" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`; },
  });
  const inp = root.querySelector('[data-change="gymphoto"]');
  if (inp) inp.onchange = async () => { const f = inp.files[0]; if (!f) return; const dataUrl = await shrink(f, 720); ui.editing = null; store.update(x => { x.equipmentPhotos ||= {}; x.equipmentPhotos[key] = dataUrl; }); };
}

const ui = { editing: null };

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
