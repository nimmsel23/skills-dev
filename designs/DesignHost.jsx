import { useEffect, useRef } from 'react';
import { useProgress } from '../data/useProgress.js';

// Hängt eine Design-Variante (Vanilla-Modul mit Shadow-DOM) in die React-Hülle.
// Schriften kommen von Google Fonts; @font-face funktioniert nicht im Shadow-DOM,
// deshalb liegt der Link im Dokument-Head.
export default function DesignHost({ design }) {
  const ref = useRef(null);
  const {ready,owner} = useProgress();

  useEffect(() => {
    if (!ready) return;
    const id = `skills-font-${design.id}`;
    if (design.fonts && !document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id; link.rel = 'stylesheet'; link.href = design.fonts;
      document.head.appendChild(link);
    }
    const root = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const prev = { bg: root.style.background, theme: meta?.getAttribute('content') };
    root.style.background = design.bg;
    meta?.setAttribute('content', design.bg);

    // StrictMode mountet doppelt; attachShadow geht nur einmal je Element.
    const el = document.createElement('div');
    ref.current.appendChild(el);
    const cleanup = design.mount(el);

    return () => {
      cleanup?.();
      el.remove();
      root.style.background = prev.bg;
      if (meta && prev.theme) meta.setAttribute('content', prev.theme);
    };
  }, [design, ready, owner]);

  return <div ref={ref} />;
}
