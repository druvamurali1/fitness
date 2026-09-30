// One-series line charts as inline SVG, Hevy-style: a readout above (the
// latest value, or the point under your finger), a clean line over a light
// area, labelled y-axis, dates spaced by real time. One series per chart.

import { fmtShort, fmtNum, parseIso } from './util.js';

const REG = new Map(); // chart id -> geometry for the pointer handler

export function lineChart(points, { unit = '', height = 190, id = 'c', right = '', label = null } = {}) {
  if (!points.length) return '<div class="empty">Nothing logged yet.</div>';
  const W = 360, H = height, padL = 52, padR = 14, padT = 12, padB = 26;
  const ts = points.map(p => parseIso(p.date).getTime());
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const ys = points.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi === lo) { lo -= Math.max(1, Math.abs(lo) * 0.1); hi += Math.max(1, Math.abs(hi) * 0.1); }
  const ticks = niceTicks(lo, hi, 3);
  lo = Math.min(lo, ticks[0]); hi = Math.max(hi, ticks[ticks.length - 1]);
  const x = i => points.length === 1 ? (padL + W - padR) / 2 : t1 === t0 ? padL + (i / (points.length - 1)) * (W - padL - padR) : padL + ((ts[i] - t0) / (t1 - t0)) * (W - padL - padR);
  const y = v => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const xs = points.map((_, i) => x(i)), yv = points.map(p => y(p.y));
  const line = xs.map((xx, i) => `${i ? 'L' : 'M'}${xx.toFixed(1)},${yv[i].toFixed(1)}`).join(' ');
  const area = points.length > 1 ? `${line} L${xs[xs.length - 1].toFixed(1)},${H - padB} L${xs[0].toFixed(1)},${H - padB} Z` : '';
  const xl = points.length === 1 ? [0] : points.length === 2 ? [0, points.length - 1] : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const fmtV = v => `${fmtNum(v, 1)}${unit ? ' ' + unit : ''}`;
  const n = points.length - 1;
  REG.set(id, { xs, yv, points, fmtV, W });
  return `<div class="chartwrap" data-chart="${id}">
  <div class="chart-read"><div><b data-r="v">${fmtV(points[n].y)}</b><span data-r="d">${label ? esc(label) + ', ' : ''}${fmtShort(points[n].date)}${points[n].note ? ', ' + esc(points[n].note) : ''}</span></div>${right}</div>
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart, ${points.length} points, latest ${fmtV(points[n].y)}">
    <g class="grid">${ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`).join('')}</g>
    <g class="axis">${ticks.map(t => `<text x="${padL - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${fmtNum(t, 1)}${unit ? ' ' + unit : ''}</text>`).join('')}
      ${xl.map(i => `<text x="${xs[i].toFixed(1)}" y="${H - 6}" text-anchor="${points.length === 1 ? 'middle' : i === 0 ? 'start' : i === n ? 'end' : 'middle'}">${fmtShort(points[i].date)}</text>`).join('')}</g>
    ${area ? `<path class="area" d="${area}"/>` : ''}
    ${points.length > 1 ? `<path class="line" d="${line}"/>` : ''}
    ${xs.map((xx, i) => `<circle class="pt${i === n ? ' last' : ''}" cx="${xx.toFixed(1)}" cy="${yv[i].toFixed(1)}" r="${i === n ? 5.5 : 3.5}"/>`).join('')}
    <line class="guide" x1="${xs[n].toFixed(1)}" x2="${xs[n].toFixed(1)}" y1="${padT}" y2="${H - padB}" visibility="hidden"/>
    <circle class="active" cx="${xs[n].toFixed(1)}" cy="${yv[n].toFixed(1)}" r="7" visibility="hidden"/>
    <rect class="hit" x="0" y="0" width="${W}" height="${H}"/>
  </svg></div>`;
}

// Drag or hover along a chart: the readout, guide line and ring follow the
// nearest point; letting go returns to the latest point.
export function bindCharts(root) {
  root.querySelectorAll('.chartwrap[data-chart]').forEach(wrap => {
    const g = REG.get(wrap.dataset.chart); if (!g) return;
    const svg = wrap.querySelector('svg'), guide = svg.querySelector('.guide'), ring = svg.querySelector('.active');
    const v = wrap.querySelector('[data-r="v"]'), dd = wrap.querySelector('[data-r="d"]');
    const lastD = dd.textContent, lastV = v.textContent;
    const show = i => { const p = g.points[i]; v.textContent = g.fmtV(p.y); dd.textContent = fmtShort(p.date) + (p.note ? ', ' + p.note : '');
      guide.setAttribute('x1', g.xs[i]); guide.setAttribute('x2', g.xs[i]); guide.setAttribute('visibility', 'visible');
      ring.setAttribute('cx', g.xs[i]); ring.setAttribute('cy', g.yv[i]); ring.setAttribute('visibility', 'visible'); };
    const reset = () => { v.textContent = lastV; dd.textContent = lastD; guide.setAttribute('visibility', 'hidden'); ring.setAttribute('visibility', 'hidden'); };
    const at = e => { const r = svg.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * g.W; let best = 0; g.xs.forEach((xx, i) => { if (Math.abs(xx - px) < Math.abs(g.xs[best] - px)) best = i; }); show(best); };
    svg.addEventListener('pointerdown', e => { svg.setPointerCapture?.(e.pointerId); at(e); });
    svg.addEventListener('pointermove', at);
    svg.addEventListener('pointerup', () => setTimeout(reset, 1200));
    svg.addEventListener('pointerleave', reset);
  });
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

function niceTicks(lo, hi, n) {
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10;
  const out = []; for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.999; v += step) out.push(+v.toFixed(3));
  return out;
}
