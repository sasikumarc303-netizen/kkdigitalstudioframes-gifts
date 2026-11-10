import { useState } from 'react';

const W = 640;

const niceMax = (max) => {
  if (max <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(max));
  const n = max / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
};

/** Vertical bar chart (SVG). data: [{ label, value }] */
export function BarChart({ data, height = 220, format = (v) => v, color = 'var(--sage)', labelEvery = 1, ariaLabel }) {
  const [hover, setHover] = useState(null);
  const pad = { l: 44, r: 8, t: 14, b: 28 };
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const bw = iw / data.length;
  const ticks = [0, 0.5, 1].map((t) => t * max);
  return (
    <figure className="a-chart">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel || 'Bar chart'}>
        {ticks.map((t) => {
          const y = pad.t + ih - (t / max) * ih;
          return (<g key={t}><line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="a-chart__grid" /><text x={pad.l - 8} y={y + 4} textAnchor="end" className="a-chart__tick">{format(t)}</text></g>);
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * ih;
          const x = pad.l + i * bw + bw * 0.18;
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={ih} fill="transparent" />
              <rect x={x} y={pad.t + ih - h} width={bw * 0.64} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="2" fill={color} opacity={hover === null || hover === i ? 1 : 0.5} />
              {i % labelEvery === 0 && <text x={pad.l + i * bw + bw / 2} y={height - 8} textAnchor="middle" className="a-chart__tick">{d.short || d.label}</text>}
            </g>
          );
        })}
      </svg>
      {hover !== null && <figcaption className="a-chart__tip">{data[hover].label}: <strong>{format(data[hover].value)}</strong></figcaption>}
    </figure>
  );
}

/** Area/line chart (SVG). */
export function LineChart({ data, height = 200, format = (v) => v, color = 'var(--sage)', labelEvery = 5, ariaLabel }) {
  const [hover, setHover] = useState(null);
  const pad = { l: 34, r: 10, t: 14, b: 28 };
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const iw = W - pad.l - pad.r;
  const ih = height - pad.t - pad.b;
  const step = data.length > 1 ? iw / (data.length - 1) : iw;
  const pts = data.map((d, i) => [pad.l + i * step, pad.t + ih - (d.value / max) * ih]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pad.l + (data.length - 1) * step},${pad.t + ih} L${pad.l},${pad.t + ih} Z`;
  return (
    <figure className="a-chart">
      <svg viewBox={`0 0 ${W} ${height}`} role="img" aria-label={ariaLabel || 'Line chart'} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((t) => { const y = pad.t + ih - t * ih; return (<g key={t}><line x1={pad.l} x2={W - pad.r} y1={y} y2={y} className="a-chart__grid" /><text x={pad.l - 6} y={y + 4} textAnchor="end" className="a-chart__tick">{format(Math.round(t * max))}</text></g>); })}
        <path d={area} fill={color} opacity="0.14" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) => (
          <g key={d.label}>
            <rect x={pad.l + i * step - step / 2} y={pad.t} width={step} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} />
            {i % labelEvery === 0 && <text x={pad.l + i * step} y={height - 8} textAnchor="middle" className="a-chart__tick">{d.short || d.label}</text>}
          </g>
        ))}
        {hover !== null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4.5" fill="var(--white)" stroke={color} strokeWidth="2" />}
      </svg>
      {hover !== null && <figcaption className="a-chart__tip">{data[hover].label}: <strong>{format(data[hover].value)}</strong></figcaption>}
    </figure>
  );
}

/** Horizontal bars with labels – used for status breakdowns and top lists. */
export function HBars({ data, color = 'var(--sage)', empty = 'No data yet' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length || data.every((d) => d.value === 0)) return <p className="a-muted">{empty}</p>;
  return (
    <ul className="a-hbars">
      {data.map((d) => (
        <li key={d.label}>
          <span className="a-hbars__label">{d.label}</span>
          <span className="a-hbars__track"><i style={{ width: `${(d.value / max) * 100}%`, background: d.color || color }} /></span>
          <strong>{d.value}</strong>
        </li>
      ))}
    </ul>
  );
}
