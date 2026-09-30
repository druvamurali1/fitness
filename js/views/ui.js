// Tiny helpers shared by the views. Views build HTML strings and delegate events.

import { displayLoad, toCanonicalLb, kgToLb, lbToKg, fmtNum, loadStep } from '../util.js';

export function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// Attach one delegated click handler; buttons carry data-action and data-* args.
export function delegate(root, handlers) {
  root.onclick = e => {
    const el = e.target.closest('[data-action]');
    if (!el || !root.contains(el)) return;
    const fn = handlers[el.dataset.action];
    if (fn) { e.preventDefault(); fn(el, e); }
  };
  root.onchange = e => {
    const el = e.target.closest('[data-change]');
    if (!el) return;
    const fn = handlers[el.dataset.change];
    if (fn) fn(el, e);
  };
}

export function loadText(lb, units, loadType) {
  if (lb == null) return 'bodyweight';
  const u = units.load;
  return `${fmtNum(displayLoad(lb, u, loadType), 1)} ${u}`;
}
export function bodyText(kg, units) {
  if (kg == null) return '–';
  return units.body === 'lb' ? `${fmtNum(kgToLb(kg), 1)} lb` : `${fmtNum(kg, 1)} kg`;
}
export function bodyFromInput(value, units) { const n = Number(value); if (!n) return null; return units.body === 'lb' ? lbToKg(n) : n; }
export function bodyToInput(kg, units) { if (kg == null) return ''; return units.body === 'lb' ? fmtNum(kgToLb(kg), 1) : fmtNum(kg, 1); }
export { displayLoad, toCanonicalLb, loadStep, fmtNum };

export function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
  else delete document.documentElement.dataset.theme;
}

// The slim sticky bar every tab opens with: title, an optional control on the
// right, and up to three numbers underneath.
export function pageBar(title, stats = [], right = '') {
  return `<div class="sbar">
  <div class="sbar-top"><span class="sbar-title">${title}</span>${right}</div>
  ${stats.length ? `<div class="sbar-stats">${stats.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('')}</div>` : ''}
</div>`;
}
