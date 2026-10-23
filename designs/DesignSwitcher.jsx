import { useEffect, useRef, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { DESIGNS } from './index.js';

const OPTIONS = [
  { id: 'classic', name: 'Original', hint: 'Aktuelle App · Charts & Hold-Timer', swatch: ['#0a0a0a', '#c8ff00', '#38bdf8'] },
  ...DESIGNS,
];

// Schwebender Design-Umschalter. Eigene, neutrale Optik, damit er in jedem Design lesbar bleibt;
// verschwindet während eines laufenden Workouts in einer Variante (Event „skills-runner“).
export default function DesignSwitcher({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const onRun = e => { setRunning(!!e.detail); if (e.detail) setOpen(false); };
    const onDoc = e => { if (box.current && !e.composedPath().includes(box.current)) setOpen(false); };
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('skills-runner', onRun);
    document.addEventListener('pointerdown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('skills-runner', onRun);
      document.removeEventListener('pointerdown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  useEffect(() => { setRunning(false); }, [value]);
  if (running) return null;

  const current = OPTIONS.find(o => o.id === value) || OPTIONS[0];
  return (
    <div
      ref={box}
      style={{ position: 'fixed', right: 14, bottom: 'calc(14px + env(safe-area-inset-bottom))', zIndex: 2000, fontFamily: 'system-ui, sans-serif' }}
    >
      {open && (
        <div
          role="menu"
          style={{ position: 'absolute', right: 0, bottom: 'calc(100% + 10px)', width: 272, background: '#121212', color: '#f5f5f5', border: '1px solid #3a3a3a', borderRadius: 16, padding: 6, boxShadow: '0 20px 50px rgba(0,0,0,.55)' }}
        >
          <div style={{ padding: '8px 10px 6px', fontSize: 10, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', color: '#9a9a9a' }}>Design wählen</div>
          {OPTIONS.map(o => (
            <button
              key={o.id}
              role="menuitemradio"
              aria-checked={o.id === value}
              onClick={() => { onChange(o.id); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 10px', border: 0, borderRadius: 11, background: o.id === value ? 'rgba(200,255,0,.12)' : 'transparent', color: 'inherit', textAlign: 'left', cursor: 'pointer' }}
            >
              <span style={{ display: 'flex', flex: 'none' }}>
                {o.swatch.map((c, i) => (
                  <i key={c} style={{ width: 16, height: 16, borderRadius: '50%', background: c, border: '1.5px solid #555', marginLeft: i ? -6 : 0 }} />
                ))}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>{o.name}</span>
                <span style={{ display: 'block', fontSize: 11, color: '#9a9a9a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.hint}</span>
              </span>
              {o.id === value && <Check size={16} color="#c8ff00" strokeWidth={3} />}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Design wechseln (aktuell ${current.name})`}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px 11px 13px', border: '1.5px solid #c8ff00', borderRadius: 999, background: '#0a0a0a', color: '#c8ff00', font: '800 12px system-ui, sans-serif', letterSpacing: '.12em', textTransform: 'uppercase', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,.45)' }}
      >
        <Palette size={16} strokeWidth={2.5} /> {current.name}
      </button>
    </div>
  );
}
