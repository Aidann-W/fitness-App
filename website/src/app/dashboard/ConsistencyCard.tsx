'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LoggedSet } from '@/lib/types';
import './ConsistencyCard.css';
const dayKey = (date: Date) => [date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
const level = (n: number) => n === 0 ? 0 : n < 4 ? 1 : n < 9 ? 2 : n < 15 ? 3 : 4;
const dateLabel = (date: Date) => date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
export default function ConsistencyCard({logs,loading}:{logs:LoggedSet[];loading:boolean}) {
 const [today,setToday]=useState<Date|null>(null);
 const [month,setMonth]=useState<Date|null>(null);
 const [selected,setSelected]=useState<string|null>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const dialog=useRef<HTMLDialogElement>(null);
 const closeButton=useRef<HTMLButtonElement>(null);
 const motion=useRef<Animation|null>(null);
 const closing=useRef(false);
 const oldOverflow=useRef<string|null>(null);
 const keyboardOpen=useRef(false);
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{const now=new Date();setToday(now);setMonth(new Date(now.getFullYear(),now.getMonth(),1));},[]);
 useEffect(()=>()=>{motion.current?.cancel();if(oldOverflow.current!==null)document.body.style.overflow=oldOverflow.current;},[]);
 const grouped=useMemo(()=>{const result=new Map<string,LoggedSet[]>();for(const log of logs){const date=new Date(log.completed_at);if(!Number.isNaN(date.getTime())){const key=dayKey(date);result.set(key,[...(result.get(key)??[]),log]);}}return result;},[logs]);
 const days=useMemo(()=>{
   if(!today)return [];
   const monday=new Date(today.getFullYear(),today.getMonth(),today.getDate()-((today.getDay()+6)%7)-25*7);
   return Array.from({length:182},(_,i)=>{const date=new Date(monday);date.setDate(monday.getDate()+i);return {date,key:dayKey(date),count:grouped.get(dayKey(date))?.length??0,future:date>today};});
 },[today,grouped]);
 const trainedDays=days.filter(d=>d.count>0).length;
 const weekCount=days.slice(-7).filter(d=>d.count>0).length;
 const months=days.filter((d,i)=>i%7===0 && (i===0 || d.date.getMonth()!==days[i-7].date.getMonth()));
 const collapsedTransform=()=>{if(!trigger.current||!dialog.current)return 'scale(.96)';const from=trigger.current.getBoundingClientRect(),to=dialog.current.getBoundingClientRect();return 'translate('+ (from.left-to.left)+'px,'+(from.top-to.top)+'px) scale('+from.width/to.width+','+from.height/to.height+')';};
 const open=(e:React.MouseEvent<HTMLButtonElement>)=>{
   if(!dialog.current||dialog.current.open||!today)return;
   keyboardOpen.current=e.detail===0;
   setMonth(new Date(today.getFullYear(),today.getMonth(),1));setSelected(dayKey(today));
   oldOverflow.current=document.body.style.overflow;document.body.style.overflow='hidden';
   dialog.current.showModal();setExpanded(true);closeButton.current?.focus();
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const transform=collapsedTransform();
   motion.current=dialog.current.animate(reduce||keyboardOpen.current ? [{opacity:0},{opacity:1}] : [{transform,opacity:.3},{transform:'none',opacity:1}],{duration:keyboardOpen.current?0:250,easing:'cubic-bezier(0.23, 1, 0.32, 1)'});
 };
 const close=()=>{
   if(!dialog.current?.open||closing.current)return;
   closing.current=true;
   const visual = getComputedStyle(dialog.current);
   const startTransform = visual.transform;
   const startOpacity = visual.opacity;
   motion.current?.cancel();
   const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const animation=dialog.current.animate(reduce||keyboardOpen.current ? [{opacity:startOpacity},{opacity:0}] : [{transform:startTransform,opacity:startOpacity},{transform:collapsedTransform(),opacity:0}],{duration:keyboardOpen.current?0:180,easing:'cubic-bezier(0.23, 1, 0.32, 1)',fill:'forwards'});
   motion.current=animation;
   animation.finished.then(()=>{dialog.current?.close();animation.cancel();closing.current=false;setExpanded(false);if(oldOverflow.current!==null){document.body.style.overflow=oldOverflow.current;oldOverflow.current=null;}trigger.current?.focus();}).catch(()=>{closing.current=false;});
 };
 const heatmap=(withMonths:boolean)=><div className="consistency-map" aria-hidden="true">{withMonths&&<div className="heatmap-months">{months.map(d=><span key={d.key} style={{gridColumn:Math.floor(days.indexOf(d)/7)+1}}>{d.date.toLocaleDateString(undefined,{month:'short'})}</span>)}</div>}<div className="heatmap-squares">{days.map(d=><span key={d.key} className={'heat-cell level-'+level(d.count)+(d.future?' future-cell':'')} title={dateLabel(d.date)+': '+d.count+' sets'}/>)}</div></div>;
 const calendar=month ? Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()},(_,i)=>new Date(month.getFullYear(),month.getMonth(),i+1)) : [];
 const offset=month ? (month.getDay()+6)%7 : 0;
 const selectedLogs=selected ? grouped.get(selected)??[] : [];
 const selectedDate=calendar.find(d=>dayKey(d)===selected);
 const nextDisabled=!!(today&&month&&month.getFullYear()===today.getFullYear()&&month.getMonth()===today.getMonth());
 const changeMonth=(delta:number)=>{if(month){setMonth(new Date(month.getFullYear(),month.getMonth()+delta,1));setSelected(null);}};
 return <>
 <button ref={trigger} type="button" className="simple-tile consistency-tile heatmap-trigger" onClick={open} disabled={loading||!today} aria-haspopup="dialog" aria-expanded={expanded} aria-controls="consistency-detail" aria-label={'Your consistency: '+trainedDays+' training days in the last 26 weeks. Open calendar'}>
  <div className="heatmap-title"><span className="sport-icon" aria-hidden="true">◎</span><div><h2>Your consistency</h2><p>Every workout adds up</p></div><span className="heatmap-expand" aria-hidden="true">⤢</span></div>
  {heatmap(false)}<div className="heatmap-badges"><span>{loading?'…':trainedDays+' training days'}</span><span>{weekCount} this week</span></div>
 </button>
 <dialog ref={dialog} id="consistency-detail" className="consistency-dialog" aria-labelledby="consistency-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
  <div className="consistency-detail-header"><span className="sport-icon" aria-hidden="true">◎</span><div><h2 id="consistency-title">Your consistency</h2><p>Days with logged workout sets</p></div><button ref={closeButton} className="consistency-close" aria-label="Close consistency calendar" onClick={close}>×</button></div>
  {heatmap(true)}<div className="heatmap-badges"><span>{trainedDays} days / 26 weeks</span><span>{weekCount} this week</span><span className="heatmap-legend">Less <i className="level-0"/><i className="level-2"/><i className="level-4"/> More sets</span></div>
  <div className="calendar-toolbar"><h3 aria-live="polite">{month?.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</h3><div><button onClick={()=>changeMonth(-1)} aria-label="Previous month">‹</button><button onClick={()=>changeMonth(1)} disabled={nextDisabled} aria-label="Next month">›</button></div></div>
  <div className="consistency-calendar"><div className="calendar-weekdays">{['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d=><span key={d}>{d}</span>)}</div><div className="calendar-dates">{Array.from({length:offset},(_,i)=><span key={'blank'+i}/>)}{calendar.map(date=>{const key=dayKey(date),count=grouped.get(key)?.length??0;return <button key={key} className={'calendar-date level-'+level(count)} aria-pressed={selected===key} aria-label={dateLabel(date)+': '+count+' sets logged'} disabled={!!today&&date>today} onClick={()=>setSelected(key)}><strong>{date.getDate()}</strong><span aria-hidden="true">{count>0?'•':''}</span></button>})}</div></div>
  <section className="consistency-day-detail" aria-live="polite"><h3>{selectedDate?selectedDate.toLocaleDateString(undefined,{month:'short',day:'numeric'})+' · '+selectedLogs.length+' sets logged':'Select a day'}</h3>{selectedLogs.length ? <ul>{selectedLogs.map((log,i)=><li key={i}><span>{log.exercise_name}</span><strong>{log.weight>0?log.weight+' '+log.unit+' × ':''}{log.reps} reps</strong></li>)}</ul> : <p>{selectedDate?'No workout sets logged on this day.':'Choose a date to review your workout sets.'}</p>}</section>
 </dialog>
 </>;
}
