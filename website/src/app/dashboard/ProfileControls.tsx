'use client';
import { useEffect, useRef, useState } from 'react';
import type { Account } from '@/lib/account';
import './ProfileControls.css';
const profileIcon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>;
export default function ProfileControls({account,onSignIn,onLogOut}:{account:Account|null;onSignIn:()=>void;onLogOut:()=>Promise<void>}) {
  const details = useRef<HTMLDetailsElement>(null);
  const [pending,setPending] = useState(false);
  useEffect(()=>{
    const close = (e:PointerEvent) => { if(details.current && !details.current.contains(e.target as Node)) details.current.open=false; };
    const escape = (e:KeyboardEvent) => { if(e.key==='Escape' && details.current?.open) {details.current.open=false;details.current.querySelector('summary')?.focus();} };
    document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
    return ()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)};
  },[]);
  return <div className="profile-controls">
    {account && !account.isAnonymous ? <details className="profile-details" ref={details}><summary className="profile-icon" aria-label="Profile" title="Profile">{profileIcon}</summary><div className="profile-popover"><strong>Account</strong><p>{account.email}</p><small>Your workouts are linked to this account.</small></div></details> : <button className="profile-icon" onClick={onSignIn} aria-label="Sign in or create an account" title="Save your progress">{profileIcon}</button>}
    {account && !account.isAnonymous && <button className="profile-icon" disabled={pending} aria-label={pending ? 'Logging out' : 'Log out'} title="Log out" onClick={async()=>{setPending(true);try{await onLogOut()}finally{setPending(false)}}}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4m-5-4h12"/></svg></button>}
  </div>;
}
