// One versioned document per person in localStorage, and a pointer to the
// active one. Everything the app knows about a person lives in their document,
// which is what makes export and import a single JSON file.

import { isoDate, uid } from './util.js';

const KEY = 'gym.people.v1';
const LEGACY_KEY = 'gym.plan.v1';
const VERSION = 1;

const listeners = new Set();
let state = null; // { active: id | null, people: { id: doc } }
let doc = null;   // the active person's document, or a fresh one while nobody is active

export function emptyDoc() {
  return { id: null, version: VERSION, createdAt: isoDate(), profile: null, plan: null, sessions: [], days: {}, photos: [], equipmentPhotos: {}, customExercises: {}, settings: { units: { load: 'lb', body: 'kg' }, theme: 'auto' } };
}

function loadState() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw);
    else {
      // First run after the single-person version: adopt its document.
      const legacy = localStorage.getItem(LEGACY_KEY);
      const d = legacy ? migrate(JSON.parse(legacy)) : null;
      state = d ? { active: 'p1', people: { p1: { ...d, id: 'p1' } } } : { active: null, people: {} };
      if (d) localStorage.removeItem(LEGACY_KEY);
    }
  } catch { state = { active: null, people: {} }; }
  state.people ||= {};
  return state;
}

export function load() {
  if (doc) return doc;
  const st = loadState();
  doc = st.active && st.people[st.active] ? migrate(st.people[st.active]) : emptyDoc();
  return doc;
}

// ── People ──────────────────────────────────────────────────────

export function people() {
  const st = loadState();
  return Object.values(st.people).filter(d => d.plan).map(d => ({ id: d.id, name: d.profile?.name || 'Someone', sessions: d.sessions.filter(s => s.completed).length, lastSeen: d.lastSeen || d.createdAt }));
}
export function activeId() { return loadState().active; }
export function switchPerson(id) { const st = loadState(); if (!st.people[id]) return; st.active = id; doc = migrate(st.people[id]); persist(); listeners.forEach(fn => fn(doc)); }
// Leave the current person without deleting anything; the welcome screen shows.
export function leavePerson() { const st = loadState(); st.active = null; doc = emptyDoc(); persist(); listeners.forEach(fn => fn(doc)); }
export function deletePerson(id) { const st = loadState(); delete st.people[id]; if (st.active === id) { st.active = null; doc = emptyDoc(); } persist(); listeners.forEach(fn => fn(doc)); }

function migrate(d) {
  // Bump VERSION and add a step here when the shape changes.
  if (!d.version) d.version = 1;
  d.sessions ||= []; d.days ||= {}; d.photos ||= []; d.equipmentPhotos ||= {}; d.customExercises ||= {}; d.settings ||= { units: { load: 'lb', body: 'kg' }, theme: 'auto' };
  return d;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn('Could not save', e); }
}
export function save() {
  const st = loadState();
  if (!doc.id) { doc.id = uid(); }
  doc.lastSeen = isoDate();
  st.people[doc.id] = doc; st.active = doc.id;
  persist();
  listeners.forEach(fn => fn(doc));
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function update(fn) { fn(doc); save(); }
// Erase the active person's data entirely.
export function reset() { const id = doc.id; doc = emptyDoc(); if (id) deletePerson(id); else listeners.forEach(fn => fn(doc)); }

export function exportJSON() { return JSON.stringify(doc, null, 2); }
export function importJSON(text) {
  const d = JSON.parse(text);
  if (!d || typeof d !== 'object' || !('sessions' in d)) throw new Error('That file is not an export from this app.');
  doc = migrate(d); doc.id = null; save();
}

// ── Sessions ────────────────────────────────────────────────────

export function completedSessions(source = 'main') {
  return load().sessions.filter(s => s.completed && s.source === source);
}
export function activeSession() { return load().sessions.find(s => !s.completed && !s.abandoned) || null; }

// The next workout in the rotation is decided by how many have been completed.
export function nextWorkout(source = 'main') {
  const d = load();
  const list = source === 'main' ? d.plan.workouts : d.plan.fallback;
  const n = completedSessions(source).length;
  return list[n % list.length];
}

// A freeform session has no workout; exercises are added as you go.
export function startFreeSession() {
  const d = load();
  const s = { id: uid(), date: isoDate(), workoutId: 'free', source: 'free', startedAt: Date.now(), finishedAt: null, completed: false,
    checklist: { warmup: false, cooldown: false, protein: false }, order: [], items: {} };
  d.sessions.push(s); save(); return s;
}
export function addFreeExercise(sessionId, exerciseId, weightLb = null) {
  update(d => { const s = d.sessions.find(x => x.id === sessionId); if (!s || s.items[exerciseId]) return; s.order.push(exerciseId); s.items[exerciseId] = { weightLb, sets: [{ reps: null, done: false }, { reps: null, done: false }, { reps: null, done: false }] }; });
}
export function addCustomExercise(name) {
  const id = 'custom:' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  update(d => { d.customExercises ||= {}; d.customExercises[id] = { name }; });
  return id;
}

export function startSession(workout, source = 'main') {
  const d = load();
  const s = { id: uid(), date: isoDate(), workoutId: workout.id, source, startedAt: Date.now(), finishedAt: null, completed: false,
    checklist: { warmup: false, cooldown: false, protein: false },
    items: Object.fromEntries(workout.exercises.map(e => [e.exerciseId, { weightLb: null, sets: Array.from({ length: e.sets }, () => ({ reps: null, done: false })) }])) };
  d.sessions.push(s); save(); return s;
}
export function finishSession(id) { update(d => { const s = d.sessions.find(x => x.id === id); if (s) { s.completed = true; s.finishedAt = Date.now(); } }); }
export function abandonSession(id) { update(d => { const i = d.sessions.findIndex(x => x.id === id); if (i >= 0) d.sessions.splice(i, 1); }); }

// History of one exercise across completed sessions, oldest first.
export function exerciseHistory(exerciseId) {
  return load().sessions.filter(s => s.completed && s.items[exerciseId]).map(s => ({ date: s.date, sessionId: s.id, ...s.items[exerciseId] }));
}

// ── Days (diet, bodyweight, waist) ──────────────────────────────

export function day(iso) { const d = load(); return d.days[iso] || {}; }
export function setDay(iso, patch) { update(d => { d.days[iso] = { ...(d.days[iso] || {}), ...patch }; }); }
