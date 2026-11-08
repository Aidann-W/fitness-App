'use client';
import { useEffect, useRef } from 'react';
import { cloudLayer } from '@/lib/altitude';
import './CloudLiftCard.css';

export default function CloudLiftCard({ pounds, period = 'Last 7 days', loading = false, animate = true, className = '' }: { pounds: number; period?: string; loading?: boolean; animate?: boolean; className?: string }) {
  const layer = cloudLayer(pounds);
  const cloud = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation | null>(null);
  const previous = useRef('translateY(42px)');
  const target = 'translateY(' + (42 - Math.min(pounds / 40000, 1) * 90) + 'px)';
  useEffect(() => {
    const element = cloud.current;
    if (!element || loading) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const from = motion.current?.playState === 'running' ? getComputedStyle(element).transform : previous.current;
    motion.current?.cancel();
    element.style.transform = target;
    if (animate) motion.current = element.animate(reduced ? [{ opacity: .65 }, { opacity: 1 }] : [{ transform: from }, { transform: target }], { duration: reduced ? 150 : 250, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    previous.current = target;
  }, [target, loading, animate]);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const cancel = () => motion.current?.cancel();
    preference.addEventListener('change', cancel);
    return () => { preference.removeEventListener('change', cancel); cancel(); };
  }, []);
  return <section className={'cloud-lift-card ' + className} aria-label="Cloud lifting progress" aria-busy={loading}>
    <div className="cloud-lift-heading"><h2>Your cloud climb</h2><span>{period}</span></div>
    <p className="cloud-lift-total">{loading ? '—' : pounds.toLocaleString()} <small>lb lifted</small></p>
    <div className="cloud-lift-scene" aria-hidden="true">
      <div className="cloud-ruler"><span>40,000 ft</span><span>20,000</span><span>6,500</span><span>Ground</span></div>
      <div className="cloud-sky"><i/><i/><i/><div ref={cloud} className="lift-cloud"><svg viewBox="0 0 180 100" fill="none"><path d="M35 80h105a25 25 0 0 0 2-50 38 38 0 0 0-71-8A30 30 0 0 0 35 80Z" fill="currentColor"/><path d="M76 59 90 45l14 14M90 45v29" stroke="#6d91bc" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg></div></div>
    </div>
    <div className="cloud-lift-level"><strong>{loading ? 'Loading your climb…' : pounds === 0 ? 'Your climb starts here' : layer.next ? layer.name + ' level' : 'Above the clouds'}</strong><span>{loading ? '—' : layer.next ? (layer.next.from - pounds).toLocaleString() + ' lb to ' + layer.next.name : '40,000 lb milestone reached'}</span></div>
    <div className="cloud-lift-meter" role="meter" aria-label={layer.next ? 'Progress to ' + layer.next.name : 'Cloud climb milestone complete'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={loading ? 0 : Math.round(layer.progress * 100)}><div style={{ transform: 'scaleX(' + (loading ? 0 : layer.progress) + ')' }} data-animate={animate}/></div>
    <p className="cloud-lift-caption">A playful scale: 1 lb lifted = 1 ft climbed.</p>
  </section>;
}
