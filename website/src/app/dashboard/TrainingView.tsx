'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useWorkouts, canStart } from './WorkoutProvider';
import WorkoutSession from './WorkoutSession';
export default function TrainingView() {
 const { session, selectedRoutine, loading, lastSets, startWorkout, updateSession, finishWorkout, setSwapIndex } = useWorkouts();
 const entered = useRef(false);
 useEffect(()=>{
   if (session) { entered.current = true; return; }
   if (!entered.current && !loading && selectedRoutine && canStart(selectedRoutine)) {
     entered.current = true;
     startWorkout(selectedRoutine);
   }
 },[session,loading,selectedRoutine,startWorkout]);
 if(session) return <WorkoutSession session={session} lastSets={lastSets} onChange={updateSession} onFinish={finishWorkout} onSwap={setSwapIndex}/>;
 if(loading || (selectedRoutine && canStart(selectedRoutine))) return <p role="status" className="empty-card">{entered.current ? 'Workout finished. Opening your activity…' : 'Opening your workout…'}</p>;
 return <div className="empty-card"><h1 className="text-xl font-semibold">Choose a workout</h1><p className="my-4">Open a routine with named exercises to start training.</p><Link className="button-primary" href="/routines">My routines</Link></div>;
}
