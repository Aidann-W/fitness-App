'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { RoutineAnswers } from '@/lib/types';
import './WorkoutQuiz.css';

type Context = NonNullable<RoutineAnswers['context']>;
const STEPS = ['Your goal', 'Your starting point', 'Your schedule', 'Your setup', 'How you feel', 'Make it yours'];
const EMPTY: Context = { specificGoal:'', deadline:'', history:'', performance:'', daysPerWeek:'3', constraints:'', environment:'Gym', limitations:'', sleep:'', stress:'', preferences:'', age:'', height:'', bodyweight:'', sex:'' };
const EQUIPMENT = ['Barbell','Dumbbells','Bench','Squat rack','Cable machine','Leg press','Pull-up bar','Bodyweight only'];

interface Props {
  answers: RoutineAnswers;
  setAnswers: Dispatch<SetStateAction<RoutineAnswers>>;
  customEquipment: string;
  setCustomEquipment: (value: string) => void;
  preferredExercises: string;
  setPreferredExercises: (value: string) => void;
  pending: boolean;
  error: string | null;
  onGenerate: (context: Context) => Promise<void>;
  onSkip: () => void;
  onClose: () => void;
}

export default function WorkoutQuiz(props: Props) {
  const { answers, setAnswers, pending } = props;
  const [step, setStep] = useState(0);
  const [context, setContext] = useState<Context>(EMPTY);
  const [keyboard, setKeyboard] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); heading.current?.closest('form')?.scrollTo(0,0); }, [step]);
  const detail = (key: keyof Context, value: string) => setContext(prev => ({ ...prev, [key]: value }));
  const field = (key: keyof Context, label: string, placeholder = '') => <label className="quiz-field"><span>{label} <small>optional</small></span><input value={context[key]} maxLength={600} onChange={e=>detail(key,e.target.value)} placeholder={placeholder}/></label>;
  const select = (key: 'goal'|'experience'|'focus', label: string, values: string[]) => <label className="quiz-field"><span>{label}</span><select value={answers[key]} onChange={e=>setAnswers(prev=>({...prev,[key]:e.target.value}))}>{values.map(value=><option key={value}>{value}</option>)}</select></label>;
  const review = [
    [answers.goal, context.specificGoal, context.deadline && `Target: ${context.deadline}`, answers.focus],
    [answers.experience, context.history, context.performance],
    [`${context.daysPerWeek} days/week · ${answers.minutes} min/session`, context.constraints],
    [context.environment, [...answers.equipment, props.customEquipment].filter(Boolean).join(', ')],
    [context.limitations && `Limits: ${context.limitations}`, context.sleep && `Sleep: ${context.sleep}`, context.stress && `Stress: ${context.stress}`],
    [context.preferences, props.preferredExercises, [context.age && `Age: ${context.age}`, context.height, context.bodyweight, context.sex].filter(Boolean).join(' · ')],
  ];
  return <form className="cloud-dialog intake-form quiz-form" onSubmit={e=>{e.preventDefault(); if(pending)return; if(step<6)setStep(step+1);else void props.onGenerate(context);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')setKeyboard(true);}} onPointerDown={()=>setKeyboard(false)}>
    <div className="quiz-top"><span className="eyebrow">YOUR NEXT WORKOUT</span><button type="button" onClick={props.onSkip} disabled={pending}>Skip quiz</button></div>
    <div className="quiz-progress-label"><span>{step<6?`Step ${step+1} of 6`:'Ready to generate'}</span><span>{Math.round(step/6*100)}%</span></div>
    <div className="quiz-progress" role="progressbar" aria-label="Workout quiz progress" aria-valuemin={0} aria-valuemax={6} aria-valuenow={step}><div style={{transform:`scaleX(${step/6})`,transition:keyboard?'none':undefined}}/></div>
    <fieldset disabled={pending} className="quiz-fields">
      <section key={step} className={keyboard?'quiz-step':'quiz-step quiz-step-motion'}>
        <h2 ref={heading} tabIndex={-1} id="intake-title">{step<6?STEPS[step]:'Your workout brief'}</h2>
        <p className="quiz-intro">{['What would you like to work toward? We’ll build one strength session to help you along.','Start where you are. Estimates are fine.','Choose the time you can realistically make.','We’ll work with what you have.','Share only what you’re comfortable with. These questions are optional.','A few finishing touches. Everything here is optional.','Check your answers, or edit a section before generating.'][step]}</p>
        {step===0 && <>{select('goal','Main goal',['Strength','Muscle building','General fitness'])}{field('specificGoal','What would success look like?','Build strength for my first pull-up')}{field('deadline','Deadline or event','In three months — or no deadline')}{select('focus',"Today’s focus",['Full body','Upper body','Lower body','Push','Pull'])}</>}
        {step===1 && <>{select('experience','Experience',['Beginner','Intermediate'])}{field('history','Your training so far','Six months lifting, usually twice a week')}{field('performance','Recent lifts or milestones','Goblet squat: 25 lb for 10 reps')}</>}
        {step===2 && <><label className="quiz-field"><span>Realistic training days per week</span><select value={context.daysPerWeek} onChange={e=>detail('daysPerWeek',e.target.value)}>{[1,2,3,4,5,6,7].map(n=><option key={n} value={n}>{n} {n===1?'day':'days'}</option>)}</select></label><label className="quiz-field"><span>Time for this workout</span><select value={answers.minutes} onChange={e=>setAnswers(prev=>({...prev,minutes:Number(e.target.value)}))}>{[10,15,20,25,30,35,40,45,50,55,60,75,90,120].map(n=><option key={n} value={n}>{n} minutes</option>)}</select></label>{field('constraints','Anything to work around?','Shift work, travel, busy mornings…')}</>}
        {step===3 && <><label className="quiz-field"><span>Where will you train?</span><select value={context.environment} onChange={e=>detail('environment',e.target.value)}>{['Gym','Home','Outdoors','Other'].map(value=><option key={value}>{value}</option>)}</select></label><fieldset className="quiz-equipment"><legend>Available equipment</legend>{EQUIPMENT.map(item=><label key={item}><input type="checkbox" checked={answers.equipment.includes(item)} onChange={()=>setAnswers(prev=>({...prev,equipment:prev.equipment.includes(item)?prev.equipment.filter(e=>e!==item):[...prev.equipment,item]}))}/>{item}</label>)}</fieldset><label className="quiz-field"><span>Other equipment <small>optional</small></span><input value={props.customEquipment} maxLength={1000} onChange={e=>props.setCustomEquipment(e.target.value)} placeholder="Bands, kettlebell…"/></label></>}
        {step===4 && <>{field('limitations','Movements or limitations to account for','Exercises you’ve been told to avoid')}{field('sleep','Typical sleep','About 7 hours a night')}{field('stress','Stress and recovery lately','Busy week; keep it manageable')}<p className="quiz-note">This isn’t a medical assessment. For significant injuries or health conditions, check with a qualified professional before training.</p></>}
        {step===5 && <>{field('preferences','What do you enjoy or want to avoid?','I like dumbbells; no burpees') }<label className="quiz-field"><span>Exercises to include <small>optional</small></span><input value={props.preferredExercises} maxLength={1500} onChange={e=>props.setPreferredExercises(e.target.value)} placeholder="Goblet squats, band rows…"/></label><details className="quiz-stats"><summary>Add basic stats (optional)</summary><p>Skip any details you’d rather not share. Include units for height and weight.</p><div className="quiz-stats-grid">{field('age','Age','e.g. 22')}{field('height','Height','e.g. 175 cm')}{field('bodyweight','Body weight','e.g. 160 lb')}{field('sex','Sex','If relevant to your training')}</div></details></>}
        {step===6 && <div className="quiz-review">{STEPS.map((title,i)=><div key={title}><div><h3>{title}</h3><p>{review[i].filter(Boolean).join(' · ')||'No extra details shared'}</p></div><button type="button" onClick={()=>setStep(i)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></div>)}</div>}
      </section>
    </fieldset>
    {props.error && <p role="alert" className="quiz-error">{props.error}</p>}
    <p className="quiz-privacy">{step===6?'Generating sends these answers to Gemini. ':''}Answers are used for this workout only and aren’t saved to your profile. Your generated workout can still be saved.</p>
    <div className="quiz-actions"><button type="button" onClick={step===0?props.onClose:()=>setStep(step-1)} disabled={pending}>{step===0?'Cancel':'Back'}</button><button type="submit" className="quiz-next" disabled={pending}>{pending?'Building your workout…':step===6?'Generate workout':'Continue'}</button></div>
    <p className="gemini-credit">Powered by Gemini</p>
  </form>;
}
