'use client';
import { useEffect, useRef } from 'react';
import './DashboardSky.css';

// Decorative depth follows scrolling; the Dashboard's data stays still.
export default function DashboardSky({ active }: { active: boolean }) {
  const artwork = useRef<HTMLDivElement>(null);
  const parallax = useRef<HTMLDivElement>(null);
  const initialDashboard = useRef(active);
  const played = useRef(false);
  useEffect(() => {
    const layer = parallax.current;
    if (!active || !layer) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number | null = null;
    let keyboardScroll = false;
    const update = () => {
      frame = null;
      if (preference.matches || keyboardScroll) { layer.style.transform = 'none'; return; }
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      const progress = distance > 0 ? Math.min(1, Math.max(0, window.scrollY / distance)) : 0;
      layer.style.transform = `translate3d(0, ${-24 * progress}px, 0)`;
    };
    const schedule = () => {
      if (!preference.matches && !keyboardScroll && frame === null) frame = requestAnimationFrame(update);
    };
    const pointerScroll = () => { keyboardScroll = false; schedule(); };
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]'))) return;
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
        keyboardScroll = true;
        if (frame !== null) cancelAnimationFrame(frame);
        update();
      }
    };
    const preferenceChanged = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      update();
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('wheel', pointerScroll, { passive: true });
    window.addEventListener('touchmove', pointerScroll, { passive: true });
    window.addEventListener('pointerdown', pointerScroll, { passive: true });
    window.addEventListener('keydown', keyboard);
    preference.addEventListener('change', preferenceChanged);
    update();
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('wheel', pointerScroll);
      window.removeEventListener('touchmove', pointerScroll);
      window.removeEventListener('pointerdown', pointerScroll);
      window.removeEventListener('keydown', keyboard);
      preference.removeEventListener('change', preferenceChanged);
      layer.style.transform = 'none';
    };
  }, [active]);
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
  return <div className="dashboard-sky" aria-hidden="true"><div ref={parallax} className="dashboard-sky-parallax"><div ref={artwork} className="dashboard-sky-art"/></div></div>;
}
