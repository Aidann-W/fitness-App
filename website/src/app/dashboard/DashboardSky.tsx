'use client';
import { useEffect, useRef } from 'react';
import './DashboardSky.css';

// One short entrance on an initial Dashboard load; route switches stay instant.
export default function DashboardSky({ active }: { active: boolean }) {
  const artwork = useRef<HTMLDivElement>(null);
  const initialDashboard = useRef(active);
  const played = useRef(false);
  useEffect(() => {
    if (!active) { initialDashboard.current = false; return; }
    if (!initialDashboard.current || played.current) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation: Animation | undefined;
    // Deferring one frame also avoids replaying the entrance in Strict Mode.
    const frame = requestAnimationFrame(() => {
      const element = artwork.current;
      if (!element) return;
      played.current = true;
      animation = element.animate(preference.matches ? [{ opacity: .7 }, { opacity: 1 }] : [{ opacity: .7, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: preference.matches ? 150 : 250, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
    });
    const settle = () => animation?.cancel();
    preference.addEventListener('change', settle);
    return () => { cancelAnimationFrame(frame); animation?.cancel(); preference.removeEventListener('change', settle); };
  }, [active]);
  if (!active) return null;
  return <div className="dashboard-sky" aria-hidden="true"><div ref={artwork} className="dashboard-sky-art"/></div>;
}
