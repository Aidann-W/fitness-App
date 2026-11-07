'use client';
import { useEffect, useState } from 'react';
import type { LoggedSet } from '@/lib/types';
export default function WorkoutWeek({logs}:{logs:LoggedSet[]}) {
 const [today,setToday]=useState<Date|null>(null);
 useEffect(()=>setToday(new Date()),[]);
 if(!today)return <div className="week-strip" aria-label="Loading this week"/>;
 const start=new Date(today.getFullYear(),today.getMonth(),today.getDate()-((today.getDay()+6)%7));
 return <section className="week-strip" aria-label="This week’s logged training"><div className="week-label"><strong>This week</strong><span>{today.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</span></div><div className="week-days">{Array.from({length:7},(_,i)=>{const day=new Date(start);day.setDate(start.getDate()+i);const trained=logs.some(l=>new Date(l.completed_at).toDateString()===day.toDateString());const current=day.toDateString()===today.toDateString();return <div key={i} className={current?'week-day today':'week-day'} aria-label={day.toDateString()+(trained?', sets logged':'')+(current?', today':'')}><span>{day.toLocaleDateString(undefined,{weekday:'short'})}</span><strong>{day.getDate()}</strong><small>{trained?'●':'·'}</small></div>})}</div></section>;
}
