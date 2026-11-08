'use client';
import { useState } from 'react';
import { useWorkouts, canStart, isStored, blankExercise } from './WorkoutProvider';
import ExercisePicker from './ExercisePicker';
import { TargetLine } from './WorkoutSession';
import { formatSet, nextTarget } from '@/lib/history';
import './RoutineEditorView.css';

export default function RoutineEditorView() {
  const { selectedRoutine: routine, loading, lastSets, editRoutine, buildRoutine, handleDeleteRoutine, setShowIntake, startWorkout, setSwapIndex, handleExerciseChange, removeExercise } = useWorkouts();
  const [selection, setSelection] = useState(0);
  const index = Math.min(selection, Math.max(0, (routine?.exercises.length ?? 0) - 1));
  const exercise = routine?.exercises[index];
  const totalSets = routine?.exercises.reduce((total, item) => total + item.sets, 0) ?? 0;
  const addExercise = () => {
    if (!routine) return;
    setSelection(routine.exercises.length);
    editRoutine({ ...routine, exercises: [...routine.exercises, { ...blankExercise }] });
  };
  return <div className="focus-session routine-editor">
    <header className="session-heading"><div><p className="eyebrow">HOME / ROUTINES / EDIT</p><h1>Edit routine</h1></div><div className="workout-header-actions"><button className="session-finish" onClick={()=>setShowIntake(true)}>Generate workout</button>{routine && <button className="session-finish session-start" disabled={!canStart(routine)} onClick={()=>startWorkout(routine)}>Start workout</button>}</div></header>
    {loading ? <p className="empty-card" role="status">Loading your routine…</p> : routine ? <>
      <section className="session-overview editor-overview" aria-label="Routine overview"><div><span>Exercises</span><strong>{routine.exercises.length}</strong></div><div><span>Working sets</span><strong>{totalSets}</strong></div><div><span>Editing exercise</span><strong>{exercise ? index+1 : '—'}<small> / {routine.exercises.length}</small></strong></div><div><span>Routine actions</span><button className="editor-text-action" onClick={buildRoutine}>Build a new routine</button></div></section>
      {!canStart(routine) && <p className="session-warning">Add at least one exercise and give each exercise a different name before starting.</p>}
      <div className="session-workspace">
        <div className="current-workspace">
          <section className="exercise-stage editor-routine-details" aria-label="Routine details"><div className="stage-copy"><p className="eyebrow">THIS WORKOUT TODAY</p><label className="editor-title-label"><span className="sr-only">Routine name</span><textarea rows={1} value={routine.title} onChange={e=>editRoutine({...routine,title:e.target.value})} className="hero-title editable-routine-title editor-routine-title"/></label><label className="editor-description-label"><span className="sr-only">Routine description</span><textarea rows={2} value={routine.description} placeholder="Add a short description" onChange={e=>editRoutine({...routine,description:e.target.value})}/></label><div className="stage-tags"><span>{routine.exercises.length} exercises</span><span>{totalSets} working sets</span></div></div></section>
          {exercise ? <section className="set-logger editor-exercise" aria-labelledby="editor-exercise-heading">
            <div className="logger-heading"><div><p className="eyebrow">EXERCISE {String(index+1).padStart(2,'0')} / {String(routine.exercises.length).padStart(2,'0')}</p><h2 id="editor-exercise-heading">Edit exercise</h2></div><div className="editor-exercise-actions">{exercise.name.trim() && <button className="swap-button" onClick={()=>setSwapIndex(index)}>Swap</button>}<button className="remove-button" onClick={()=>{removeExercise(index);setSelection(Math.max(0,index-1));}} aria-label={`Remove exercise ${index+1}`}>Remove</button></div></div>
            <ExercisePicker key={index} label={`Exercise ${index+1} name`} value={exercise.name} onChange={name=>handleExerciseChange(index,'name',name)} exclude={routine.exercises.filter((_,i)=>i!==index).map(item=>item.name)}/>
            <div className="editor-fields"><label>Sets<input aria-label={`Exercise ${index+1} sets`} type="number" min="1" value={exercise.sets} onChange={e=>handleExerciseChange(index,'sets',Math.max(1,parseInt(e.target.value)||1))}/></label><label>Reps<input aria-label={`Exercise ${index+1} reps`} type="text" value={exercise.reps} onChange={e=>handleExerciseChange(index,'reps',e.target.value)}/></label><label>Rest (sec)<input aria-label={`Exercise ${index+1} rest in seconds`} type="number" min="0" value={exercise.rest_seconds} onChange={e=>handleExerciseChange(index,'rest_seconds',Math.max(0,parseInt(e.target.value)||0))}/></label></div>
            {exercise.notes && <p className="stage-note">{exercise.notes}</p>}
            {lastSets[exercise.name] && <p className="previous-sets">Last time: {lastSets[exercise.name].map(formatSet).join(', ')}</p>}
            <TargetLine target={nextTarget(lastSets[exercise.name],exercise.reps)}/>
            <div className="session-bottom-actions"><button className="next-exercise" disabled={index===0} onClick={()=>setSelection(index-1)}>Previous</button>{index<routine.exercises.length-1 ? <button className="next-exercise" onClick={()=>setSelection(index+1)}>Next exercise</button> : <button className="session-primary" onClick={addExercise}>Add exercise</button>}</div>
          </section> : <div className="set-logger"><h2>Add your first exercise</h2><button className="session-primary mt-4" onClick={addExercise}>Add exercise</button></div>}
          {isStored(routine) && <button className="editor-delete" onClick={()=>handleDeleteRoutine(routine)}>Delete routine</button>}
        </div>
        <aside className="exercise-queue" aria-labelledby="editor-queue-heading"><div className="queue-heading"><h2 id="editor-queue-heading">Workout plan</h2><span>{routine.exercises.length} exercises</span></div><ol>{routine.exercises.map((item,i)=><li key={i}><button aria-current={i===index?'step':undefined} onClick={()=>setSelection(i)}><span className="queue-marker">{String(i+1).padStart(2,'0')}</span><span className="queue-details"><strong>{item.name||'New exercise'}</strong><small>{item.sets} × {item.reps} · {item.rest_seconds}s rest</small><span>{i===index?'Editing':'Select to edit'}</span></span></button></li>)}</ol><button className="editor-add-exercise" onClick={addExercise}>+ Add exercise</button></aside>
      </div>
    </> : <div className="empty-card"><h2>No routine selected</h2><p>Open one from My routines, or build your own.</p><button className="session-primary mt-4" onClick={buildRoutine}>Build a routine</button></div>}
  </div>;
}
