import { useEffect, useRef } from 'react';
import { useProgress } from '../data/useProgress.js';
import { bindEmbeddedRoute } from './core.js';
import { installEmbeddedWorkoutHandler } from '../data/workoutCompletion.js';

// Hängt eine Design-Variante (Vanilla-Modul mit Shadow-DOM) in die React-Hülle.
// Schriften kommen von Google Fonts; @font-face funktioniert nicht im Shadow-DOM,
// deshalb liegt der Link im Dokument-Head.
// `embedded` lässt html-Hintergrund und theme-color in der Hand der Shell.
export default function DesignHost({ design, embedded = false, routeBridge = null, onWorkoutComplete }) {
  const ref = useRef(null);
  const {ready,owner} = useProgress();
  const onWorkoutCompleteRef = useRef(onWorkoutComplete);
  onWorkoutCompleteRef.current = onWorkoutComplete;

  useEffect(() => {
    if (!ready) return undefined;
    const id = `skills-font-${design.id}`;
    if (design.fonts && !document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = design.fonts;
      document.head.appendChild(link);
    }
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = embedded ? null : { bg: root.style.background, theme: meta?.getAttribute('content') };
    if (!embedded) {
      root.style.background = design.bg;
      meta?.setAttribute('content', design.bg);
    }
    const unbindRoute = embedded && routeBridge ? bindEmbeddedRoute(routeBridge) : null;
    // Callback wins over the window event. No callback: keep the event so
    // standalone and older hosts still hear the completion.
    const uninstallWorkout = embedded ? installEmbeddedWorkoutHandler(workout => {
      const deliver = onWorkoutCompleteRef.current;
      if (typeof deliver !== 'function') return false;
      deliver(workout);
      return true;
    }) : null;

    // StrictMode mountet doppelt; attachShadow geht nur einmal je Element.
    const el = document.createElement('div');
    ref.current.appendChild(el);
    const cleanup = design.mount(el);

    return () => {
      cleanup?.();
      el.remove();
      unbindRoute?.();
      uninstallWorkout?.();
      if (!embedded && prev) {
        root.style.background = prev.bg;
        if (meta && prev.theme) meta.setAttribute('content', prev.theme);
      }
    };
  }, [design, ready, owner, embedded, routeBridge]);

  return <div ref={ref} style={embedded ? { background: design.bg, minHeight: '100%' } : undefined} />;
}
