'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { progressFor, weightedExercises, type ProgressPoint } from '@/lib/history';
import type { LoggedSet } from '@/lib/types';

// Validated with the dataviz palette checker against the white card surface.
const LINE_COLOR = '#3a72b0';
const GRID_COLOR = '#e6ecf2';

const CHART_HEIGHT = 200;
const PAD = { top: 16, right: 56, bottom: 28, left: 44 };

const formatPounds = (n: number) => n.toLocaleString();
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

// Round, evenly spaced y-axis values that cover the data with a little room.
function niceTicks(min: number, max: number): number[] {
  const span = Math.max(max - min, 10);
  const rough = span / 3;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  const start = Math.floor((min - span * 0.1) / step) * step;
  const end = Math.ceil((max + span * 0.1) / step) * step;
  const ticks: number[] = [];
  for (let v = Math.max(0, start); v <= end + step / 2; v += step) ticks.push(Math.round(v * 10) / 10);
  return ticks;
}

function ProgressChart({ points, exercise }: { points: ProgressPoint[]; exercise: string }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // Drawn at the real pixel width so text stays readable on phones.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const weights = points.map((p) => p.weight);
  const ticks = niceTicks(Math.min(...weights), Math.max(...weights));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const plotWidth = Math.max(width - PAD.left - PAD.right, 1);
  const plotHeight = CHART_HEIGHT - PAD.top - PAD.bottom;

  const x = (i: number) => PAD.left + (points.length === 1 ? plotWidth / 2 : (i / (points.length - 1)) * plotWidth);
  const y = (w: number) => PAD.top + plotHeight - ((w - yMin) / (yMax - yMin || 1)) * plotHeight;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.weight)}`).join(' ');
  const last = points.length - 1;

  const nearest = (clientX: number) => {
    const rect = frameRef.current!.getBoundingClientRect();
    const px = clientX - rect.left;
    return points.reduce((best, _, i) => (Math.abs(x(i) - px) < Math.abs(x(best) - px) ? i : best), 0);
  };

  const handleKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActive((i) => Math.min((i ?? -1) + 1, last));
    else if (e.key === 'ArrowLeft') setActive((i) => Math.max((i ?? last + 1) - 1, 0));
    else return;
    e.preventDefault();
  };

  const shown = active !== null ? points[active] : null;

  return (
    <div
      ref={frameRef}
      className="relative mt-3"
      tabIndex={0}
      role="img"
      aria-label={`${exercise}: heaviest set per workout, from ${points[0].weight} lb to ${points[last].weight} lb. Use the arrow keys to read each workout.`}
      onKeyDown={handleKey}
      onFocus={() => setActive((i) => i ?? last)}
      onBlur={() => setActive(null)}
      onPointerMove={(e: PointerEvent) => setActive(nearest(e.clientX))}
      // A tap on a phone has no pointer movement, so pick the point on press.
      onPointerDown={(e: PointerEvent) => setActive(nearest(e.clientX))}
      // Touch fires a leave right after every tap, so only a mouse clears it.
      onPointerLeave={(e: PointerEvent) => e.pointerType === 'mouse' && setActive(null)}
    >
      {width > 0 && (
        <svg width={width} height={CHART_HEIGHT} aria-hidden="true" className="block overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={GRID_COLOR} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-500 text-[11px] tabular-nums">
                {formatPounds(tick)}
              </text>
            </g>
          ))}

          <text x={x(0)} y={CHART_HEIGHT - 6} textAnchor={points.length === 1 ? 'middle' : 'start'} className="fill-slate-500 text-[11px]">
            {shortDate(points[0].date)}
          </text>
          {points.length > 1 && (
            <text x={x(last)} y={CHART_HEIGHT - 6} textAnchor="end" className="fill-slate-500 text-[11px]">
              {shortDate(points[last].date)}
            </text>
          )}

          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="#94a3b8" strokeWidth={1} />
          )}

          <path d={path} fill="none" stroke={LINE_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {points.map((p, i) => (
            <circle
              key={p.sessionId}
              cx={x(i)}
              cy={y(p.weight)}
              r={i === active ? 6 : 4}
              fill={LINE_COLOR}
              stroke="white"
              strokeWidth={2}
            />
          ))}

          <text x={x(last) + 10} y={y(points[last].weight)} dy="0.32em" className="fill-slate-900 text-[12px] font-semibold">
            {formatPounds(points[last].weight)} lb
          </text>
        </svg>
      )}

      {shown && active !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl border border-[#d5e0e8] bg-white px-3 py-2 text-xs shadow-md"
          style={{ left: Math.min(Math.max(x(active), 70), width - 70) }}
        >
          <p className="font-semibold text-slate-900">{formatPounds(shown.weight)} lb × {shown.reps}</p>
          <p className="text-slate-500">{shortDate(shown.date)}</p>
        </div>
      )}
    </div>
  );
}

export default function ProgressPanel({ logs }: { logs: LoggedSet[] }) {
  const exercises = useMemo(() => weightedExercises(logs), [logs]);
  const [picked, setPicked] = useState<string | null>(null);
  const exercise = picked && exercises.includes(picked) ? picked : exercises[0];
  const points = useMemo(() => (exercise ? progressFor(logs, exercise) : []), [logs, exercise]);



  return (
    <div className="progress-layout">

      {!exercise && <div className="panel progress-empty"><h3>Strength progress</h3><p>Log a weighted exercise to start your chart.</p><div className="chart-placeholder" aria-hidden="true"><span/><span/><span/><span/></div><small>No lifting data yet</small></div>}
      {exercise && (
        <div className="rounded-[24px] border border-[#d5e0e8] bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900">Strength progress</h3>
              <p className="text-xs text-slate-500">Heaviest set each workout, in lb</p>
            </div>
            <label className="text-xs text-slate-500">
              <span className="sr-only">Exercise</span>
              <select
                value={exercise}
                onChange={(e) => setPicked(e.target.value)}
                className="h-11 max-w-[12rem] rounded-xl border border-slate-300 bg-[#f4f8fb] px-2 text-sm text-slate-900"
              >
                {exercises.map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
          </div>

          {points.length < 2 ? (
            <p className="mt-4 text-sm text-slate-600">
              {formatPounds(points[0].weight)} lb × {points[0].reps} on {shortDate(points[0].date)}. Log{' '}
              {exercise} in one more workout to see a trend.
            </p>
          ) : (
            <ProgressChart points={points} exercise={exercise} />
          )}

          <details className="mt-3 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 text-xs font-medium text-[#3d6d8c]">Show as table</summary>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-1 font-medium">Date</th>
                  <th className="py-1 text-right font-medium">Heaviest set</th>
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.sessionId} className="border-t border-[#e6ecf2]">
                    <td className="py-1 text-slate-600">{shortDate(p.date)}</td>
                    <td className="py-1 text-right tabular-nums text-slate-900">{formatPounds(p.weight)} lb × {p.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </div>
      )}
    </div>
  );
}
