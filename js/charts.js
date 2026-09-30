// One-series line charts as inline SVG. One hue for the line, the accent for the
// points, hover tooltip, and the caller always renders a table beside it.

import { fmtShort, fmtNum } from './util.js';

export function lineChart(points, { unit = '', height = 180, id = 'c' } = {}) {
  if (!points.length) return '<div class="empty">Nothing logged yet.</div>';
  const W = 400, H = height, padL = 44, padR = 16, padT = 20, padB = 28;
  const ys = points.map(p => p.y);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (hi === lo) { lo -= 1; hi += 1; }
  const span = hi - lo; lo -= span * 0.15; hi += span * 0.15;
  const x = i => points.length === 1 ? W / 2 : padL + (i / (points.length - 1)) * (W - padL - padR);
  const y = v => padT + (1 - (v - lo) / (hi - lo)) * (H - padT - padB);
  const ticks = niceTicks(lo, hi, 4);
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');
  const labelIdx = new Set([0, points.length - 1, ys.indexOf(Math.max(...ys))]);
  const xl = points.length <= 6 ? points.map((_, i) => i) : [0, Math.floor((points.length - 1) / 2), points.length - 1];
  return `<div class="chartwrap" data-chart="${id}">
<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart, ${points.length} points">
  <g class="grid">${ticks.map(t => `<line x1="${padL}" x2="${W - padR}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}"/>`).join('')}</g>
  <g class="axis">${ticks.map(t => `<text x="${padL - 6}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end">${fmtNum(t, 1)}</text>`).join('')}
  ${xl.map(i => `<text x="${x(i).toFixed(1)}" y="${H - 8}" text-anchor="middle">${fmtShort(points[i].date)}</text>`).join('')}</g>
  <path class="line" d="${path}"/>
  ${points.map((p, i) => `<circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}"/>`).join('')}
  ${points.map((p, i) => labelIdx.has(i) ? `<text class="lab" x="${x(i).toFixed(1)}" y="${(y(p.y) - 10).toFixed(1)}" text-anchor="middle">${fmtNum(p.y, 1)}${unit ? ' ' + unit : ''}</text>` : '').join('')}
  ${points.map((p, i) => `<circle class="pt hit" cx="${x(i).toFixed(1)}" cy="${y(p.y).toFixed(1)}" data-i="${i}"><title>${fmtShort(p.date)}: ${fmtNum(p.y, 1)}${unit ? ' ' + unit : ''}${p.note ? ' · ' + p.note : ''}</title></circle>`).join('')}
</svg></div>`;
}

function niceTicks(lo, hi, n) {
  const raw = (hi - lo) / n;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10;
  const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(+v.toFixed(3));
  return out;
}
