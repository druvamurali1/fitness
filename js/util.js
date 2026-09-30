// Small helpers shared by the generator, store and views. No DOM here.

export const LB_PER_KG = 2.2046226218;

export function kgToLb(kg) { return kg * LB_PER_KG; }
export function lbToKg(lb) { return lb / LB_PER_KG; }

// Round a load to the nearest step the gym actually has.
export function roundLoad(value, unit, loadType) {
  const step = loadStep(unit, loadType);
  return Math.round(value / step) * step;
}
export function loadStep(unit, loadType) {
  if (unit === 'kg') return loadType === 'barbell' ? 2.5 : (loadType === 'stack' ? 5 : 1);
  return loadType === 'barbell' ? 5 : (loadType === 'stack' ? 5 : 5);
}

// Convert a canonical-lb load for display in the chosen unit.
export function displayLoad(lb, unit, loadType) {
  if (lb == null) return null;
  return unit === 'kg' ? roundLoad(lbToKg(lb), 'kg', loadType) : lb;
}
export function toCanonicalLb(value, unit) { return unit === 'kg' ? kgToLb(value) : value; }

export function fmtNum(n, digits = 0) {
  if (n == null || Number.isNaN(n)) return '–';
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

// Dates. All stored dates are ISO 'YYYY-MM-DD' in local time.
export function isoDate(d = new Date()) {
  const x = new Date(d);
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}
export function parseIso(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(iso, n) { const d = parseIso(iso); d.setDate(d.getDate() + n); return isoDate(d); }
export function dayOfWeek(iso) { return parseIso(iso).getDay(); }
// Weeks start on Monday.
export function weekStart(iso) { const dow = dayOfWeek(iso); return addDays(iso, dow === 0 ? -6 : 1 - dow); }
export function daysBetween(a, b) { return Math.round((parseIso(b) - parseIso(a)) / 86400000); }
export function fmtDate(iso, opts = { weekday: 'long', day: 'numeric', month: 'short' }) {
  return parseIso(iso).toLocaleDateString(undefined, opts);
}
export function fmtShort(iso) { return parseIso(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); }

export function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

export function mean(arr) { const xs = arr.filter(x => typeof x === 'number' && !Number.isNaN(x)); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; }

// Estimated one-rep max, Epley. Used only to compare sessions of different reps.
export function e1rm(weight, reps) { if (!weight || !reps) return 0; return reps === 1 ? weight : weight * (1 + reps / 30); }

export function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
