// Router and shell. Views render into #view and re-render on store changes.

import * as store from './store.js';
import { generatePlan, freePlan, PLAN_VERSION } from './generator.js';
import { PROFILES } from './data/profiles.js';
import { renderOnboarding } from './views/onboarding.js';
import { renderToday } from './views/today.js';
import { renderWeek } from './views/week.js';
import { renderProgress } from './views/progress.js';
import { renderPlan } from './views/plan.js';
import { renderExercise } from './views/exercise.js';
import { applyTheme } from './views/ui.js';

const views = { today: renderToday, week: renderWeek, progress: renderProgress, plan: renderPlan };
const root = document.getElementById('view');
const nav = document.getElementById('nav');
let current = null;

export function navigate(tab) { location.hash = '#' + tab; }

function route() {
  const doc = store.load();
  applyTheme(doc.settings.theme);
  // A stored plan older than the data layer is rebuilt from the profile. A
  // profile loaded from a preset picks up the preset's newer fields too.
  if (doc.plan && doc.profile && doc.plan.version !== PLAN_VERSION) {
    const base = doc.profile.presetId && PROFILES[doc.profile.presetId] ? { ...PROFILES[doc.profile.presetId], ...doc.profile } : doc.profile;
    const fresh = doc.plan.mode === 'free' ? freePlan(base) : generatePlan(base);
    if (!fresh.blocked) { fresh.createdAt = doc.plan.createdAt; store.update(d => { d.profile = base; d.plan = fresh; }); return; }
  }
  if (!doc.plan || location.hash.startsWith('#setup/')) {
    if (doc.plan && location.hash.startsWith('#setup/')) store.leavePerson();
    nav.hidden = true; current = 'onboarding'; renderOnboarding(root, { doc: store.load(), done: () => navigate('today') }); return; }
  const parts = (location.hash || '#today').slice(1).split('/');
  let tab = parts[0];
  if (tab === 'home') { store.leavePerson(); location.hash = '#today'; return; }
  nav.hidden = false;
  if (tab === 'exercise' && parts[1]) {
    nav.querySelectorAll('a').forEach(a => a.removeAttribute('aria-current'));
    const changed = current !== location.hash; current = location.hash;
    renderExercise(root, { doc, navigate }, decodeURIComponent(parts[1]));
    if (changed) { window.scrollTo(0, 0); root.focus({ preventScroll: true }); }
    return;
  }
  if (!views[tab]) tab = 'today';
  nav.querySelectorAll('a').forEach(a => { if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  const changed = current !== tab;
  current = tab;
  const y = window.scrollY;
  views[tab](root, { doc, navigate });
  if (changed) { window.scrollTo(0, 0); root.focus({ preventScroll: true }); } else window.scrollTo(0, y);
}

window.addEventListener('hashchange', route);
store.subscribe(() => route());
route();

// Offline cache. Not on localhost, where it would serve stale files during development.
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !isLocal) {
  navigator.serviceWorker.register('sw.js').then(reg => { reg.update().catch(() => {}); }).catch(() => {});
  // A new version took over: reload once so the screen matches the new files.
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded) return; reloaded = true; location.reload(); });
}
