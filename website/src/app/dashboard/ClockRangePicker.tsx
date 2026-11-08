'use client';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { clockLabel, clockMinutes, clockPoint, clockValue, minutesOnDial, rangeArc, rangeMinutes, type ClockSelection } from '@/lib/clockRange';
import './ClockRangePicker.css';

type Endpoint = 'start' | 'end';
interface Props { start: string; end: string; nextDay?: boolean; disabled?: boolean; label?: string; onSave: (range: ClockSelection) => Promise<boolean>; }
export default function ClockRangePicker({ start, end, nextDay = false, disabled = false, label = 'Edit session time', onSave }: Props) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const oldOverflow = useRef<string | null>(null), dragging = useRef<Endpoint | null>(null);
  const [range, setRange] = useState<ClockSelection>({ start, end, nextDay });
  const [active, setActive] = useState<Endpoint>('end');
  const [pending, setPending] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (oldOverflow.current !== null) document.body.style.overflow = oldOverflow.current; }, []);
  const open = () => {
    setRange({ start, end, nextDay }); setActive('end'); setError(null);
    oldOverflow.current = document.body.style.overflow; document.body.style.overflow = 'hidden';
    dialog.current?.showModal();
  };
  const duration = rangeMinutes(range);
  const startMinute = clockMinutes(range.start) ?? 0, endMinute = clockMinutes(range.end) ?? 0;
  const activeMinute = active === 'start' ? startMinute : endMinute;
  const setMinute = (endpoint: Endpoint, minute: number) => { setRange(previous => ({ ...previous, [endpoint]: clockValue(minute) })); setError(null); };
  const updateFromPointer = (event: PointerEvent<HTMLDivElement>, endpoint: Endpoint) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2, y = event.clientY - rect.top - rect.height / 2;
    if (Math.hypot(x, y) < rect.width * .12) return;
    setRange(previous => ({ ...previous, [endpoint]: clockValue(minutesOnDial(x, y, clockMinutes(previous[endpoint]) ?? 0)) }));
    setError(null);
  };
  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (pending || event.button !== 0) return;
    const handle = (event.target as Element).closest('[data-hand]');
    const endpoint = handle?.getAttribute('data-hand') === 'start' ? 'start' : handle?.getAttribute('data-hand') === 'end' ? 'end' : active;
    dragging.current = endpoint; setActive(endpoint); event.preventDefault();
    if (handle instanceof HTMLElement) handle.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId); updateFromPointer(event, endpoint);
  };
  const handleKey = (event: KeyboardEvent<HTMLButtonElement>, endpoint: Endpoint) => {
    const current = clockMinutes(range[endpoint]) ?? 0;
    const delta = event.shiftKey ? 1 : 5;
    const next = event.key === 'ArrowUp' || event.key === 'ArrowRight' ? current + delta : event.key === 'ArrowDown' || event.key === 'ArrowLeft' ? current - delta : event.key === 'PageUp' ? current + 60 : event.key === 'PageDown' ? current - 60 : event.key === 'Home' ? 0 : event.key === 'End' ? 1439 : null;
    if (next === null) return;
    event.preventDefault(); setActive(endpoint); setMinute(endpoint, next);
  };
  const submit = async () => {
    if (pending || duration === null) return;
    setPending(true); setError(null);
    try { if (await onSave(range)) dialog.current?.close(); else setError('We couldn’t save that time. Check your connection and try again.'); }
    catch (err) { setError(err instanceof Error ? err.message : 'We couldn’t save that time. Please try again.'); }
    finally { setPending(false); }
  };
  return <>
    <button ref={trigger} type="button" className="clock-range-trigger" disabled={disabled} onClick={open} aria-label={label + ': ' + clockLabel(start) + ' to ' + clockLabel(end) + (nextDay ? ', next day' : '')} aria-haspopup="dialog"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg><span>{clockLabel(start)} <span aria-hidden="true">–</span> {clockLabel(end)}{nextDay ? ' +1 day' : ''}</span><span className="clock-trigger-edit">Edit time</span></button>
    <dialog ref={dialog} className="clock-range-dialog" aria-labelledby={id+'-title'} onCancel={event => { if (pending) event.preventDefault(); }} onClose={() => { dragging.current = null; if (oldOverflow.current !== null) { document.body.style.overflow = oldOverflow.current; oldOverflow.current = null; } trigger.current?.focus(); }}>
      <div className="clock-dialog-heading"><div><p>SELECT TIME</p><h2 id={id+'-title'}>Your workout window</h2></div><button type="button" disabled={pending} aria-label="Close time picker" onClick={() => dialog.current?.close()}>×</button></div>
      <div className="clock-endpoints" role="group" aria-label="Active clock hand">{(['start','end'] as const).map(endpoint => <button key={endpoint} type="button" disabled={pending} aria-pressed={active === endpoint} onClick={() => setActive(endpoint)}><span>{endpoint === 'start' ? 'Start' : 'Finish'}</span><strong>{clockLabel(range[endpoint])}</strong></button>)}</div>
      <div className="clock-digital"><strong>{(Math.floor(activeMinute/60)%12 || 12).toString().padStart(2,'0')}<span>:</span>{String(activeMinute%60).padStart(2,'0')}</strong><div role="group" aria-label={active === 'start' ? 'Start time AM or PM' : 'Finish time AM or PM'}>{[0,720].map(half => <button key={half} type="button" disabled={pending} aria-pressed={(activeMinute>=720 ? 720 : 0) === half} onClick={() => setMinute(active, activeMinute%720+half)}>{half === 0 ? 'AM' : 'PM'}</button>)}</div></div>
      <p className="clock-instructions">Drag either hand to highlight your time.</p>
      <p id={id+'-keys'} className="sr-only">Arrow keys change five minutes. Hold Shift for one minute. Page Up and Page Down change one hour.</p>
      <div className="range-clock-face" onPointerDown={pointerDown} onPointerMove={event => { if (dragging.current && !pending) updateFromPointer(event, dragging.current); }} onPointerUp={event => { dragging.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }}>
        <svg viewBox="0 0 320 320" aria-hidden="true"><circle cx="160" cy="160" r="150" className="clock-face-fill"/><circle cx="160" cy="160" r="108" className="clock-arc-track"/><path d={rangeArc(startMinute, duration ?? 0)} className="clock-range-arc" fill="none"/>{Array.from({length:12},(_,index)=>{const point=clockPoint(index*60,134);return <text key={index} x={point.x} y={point.y} dy=".35em" textAnchor="middle">{index || 12}</text>;})}{(['start','end'] as const).map(endpoint=>{const point=clockPoint(endpoint==='start'?startMinute:endMinute);return <line key={endpoint} x1="160" y1="160" x2={point.x} y2={point.y} className={'clock-hand-line '+endpoint}/>;})}<circle cx="160" cy="160" r="4" className="clock-center"/></svg>
        {(['start','end'] as const).map(endpoint=>{const minute=endpoint==='start'?startMinute:endMinute,point=clockPoint(minute);return <button key={endpoint} data-hand={endpoint} type="button" role="slider" aria-label={endpoint==='start'?'Start time hand':'Finish time hand'} aria-describedby={id+'-keys'} aria-valuemin={0} aria-valuemax={1439} aria-valuenow={minute} aria-valuetext={clockLabel(range[endpoint])} disabled={pending} className={'clock-hand-handle '+endpoint} style={{left:point.x/320*100+'%',top:point.y/320*100+'%',zIndex:active===endpoint?3:2}} onFocus={()=>setActive(endpoint)} onKeyDown={event=>handleKey(event,endpoint)}><span aria-hidden="true">{endpoint==='start'?'S':'F'}</span></button>;})}
      </div>
      <p className="clock-range-duration" role="status">{duration === null ? 'Choose a valid range of up to 24 hours.' : (Math.floor(duration/60) ? Math.floor(duration/60)+' hr ' : '') + (duration%60 ? duration%60+' min' : '') + (range.nextDay ? ' · finishes next day' : '')}{duration !== null && duration >= 720 && <small>Highlighted ring includes a full clock turn.</small>}</p>
      <label className="clock-next-day"><input type="checkbox" checked={range.nextDay} disabled={pending} onChange={event=>{setRange(previous=>({...previous,nextDay:event.target.checked}));setError(null);}}/>Finish on the next day</label>
      <details className="clock-exact-times"><summary>Enter exact times</summary><div>{(['start','end'] as const).map(endpoint=><label key={endpoint}><span>{endpoint==='start'?'Start':'Finish'}</span><input type="time" aria-label={endpoint==='start'?'Exact start time':'Exact finish time'} onFocus={()=>setActive(endpoint)} disabled={pending} value={range[endpoint]} onInput={event=>{const value=event.currentTarget.value;setRange(previous=>({...previous,[endpoint]:value}));setError(null);}} onChange={event=>{const value=event.target.value;setRange(previous=>({...previous,[endpoint]:value}));setError(null);}}/></label>)}</div></details>
      {error && <p className="clock-save-error" role="alert">{error}</p>}
      <div className="clock-dialog-actions"><button type="button" disabled={pending} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="clock-save-button" disabled={pending || duration===null} onClick={submit}>{pending ? 'Saving…' : 'Save time'}</button></div>
    </dialog>
  </>;
}
