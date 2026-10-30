// Gemeinsame Navigation für die Original-Karte und alle Design-Varianten:
// Wischen (Touch) und Tastatur wechseln zwischen Skills bzw. zurück zur Liste.
//   Detail:  ← / → (oder Wischen) = vorheriger / nächster Skill, Esc = zur Liste
//   Liste:   ↑ ↓ ← → bewegen den Fokus über die Zeilen, Enter öffnet (nativer Button)
// Laufende Workouts schalten die Navigation über `enabled()` ab.

export const CATEGORY_ORDER = ['push', 'pull', 'core', 'legs', 'balance'];
export const SWIPE = { minDistance: 56, maxDuration: 700, dominance: 1.6, edge: 24 };

// Reihenfolge wie in den Listen: nach Kategorie gruppiert.
export function orderedIds(skills) {
  return CATEGORY_ORDER.flatMap(c => skills.filter(s => s.category === c).map(s => s.id));
}

// Nachbar-Skill; an den Enden null (kein Umbruch, damit Wischen am Ende nicht springt).
export function neighborId(ids, id, dir) {
  const i = ids.indexOf(id);
  return i < 0 ? null : ids[i + dir] ?? null;
}

// Finger nach links = nächster Skill (+1), nach rechts = vorheriger (-1), sonst 0.
// Kantenstarts bleiben dem System (iOS/Android-Zurück-Geste).
export function swipeStep(start, end, viewportWidth, o = SWIPE) {
  const dx = end.x - start.x, dy = end.y - start.y;
  if (end.t - start.t > o.maxDuration) return 0;
  if (Math.abs(dx) < o.minDistance || Math.abs(dx) < Math.abs(dy) * o.dominance) return 0;
  if (viewportWidth && (start.x < o.edge || start.x > viewportWidth - o.edge)) return 0;
  return dx < 0 ? 1 : -1;
}

export function keyAction(key, inDetail) {
  if (inDetail) {
    if (key === 'ArrowLeft') return { type: 'step', dir: -1 };
    if (key === 'ArrowRight') return { type: 'step', dir: 1 };
    if (key === 'Escape') return { type: 'back' };
    return null;
  }
  if (key === 'ArrowDown' || key === 'ArrowRight') return { type: 'row', dir: 1 };
  if (key === 'ArrowUp' || key === 'ArrowLeft') return { type: 'row', dir: -1 };
  return null;
}

const SWIPE_BLOCKED_TAGS = new Set(['input', 'textarea', 'select', 'video', 'iframe']);
const KEY_BLOCKED_TAGS = new Set(['input', 'textarea', 'select']);

// Elemente, auf denen ein Wisch etwas anderes bedeutet (Slider, Video, Diagramme,
// horizontal scrollende Bereiche). Diagramme markieren sich mit data-no-swipe.
function swipeBlocked(path, win) {
  for (const el of path) {
    if (el.nodeType !== 1) continue;
    if (SWIPE_BLOCKED_TAGS.has(el.localName) || el.hasAttribute('data-no-swipe') || el.isContentEditable) return true;
    if (el.scrollWidth > el.clientWidth + 1 && /auto|scroll/.test(win.getComputedStyle(el).overflowX)) return true;
  }
  return false;
}

function typing(target) {
  return !!target && target.nodeType === 1 && (
    KEY_BLOCKED_TAGS.has(target.localName) || target.isContentEditable || !!target.closest?.('[role="menu"],[role="dialog"]'));
}

// skills:  Skill-Liste (Reihenfolge wird über orderedIds bestimmt)
// root:    Document oder ShadowRoot, in dem die Listenzeilen liegen
// rows:    Selektor der fokussierbaren Listenzeilen
// current: () => geöffnete Skill-ID oder null (Liste)
// go:      (id|null, dir) => Skill wechseln bzw. zur Liste (null)
// enabled: () => false, solange ein Workout läuft oder gespeichert wird
export function attachNav({ skills, root, rows, current, go, enabled = () => true, doc = document, win = window }) {
  const ids = orderedIds(skills);
  const step = dir => {
    const id = current();
    const next = id && neighborId(ids, id, dir);
    if (!next) return false;
    go(next, dir);
    return true;
  };

  const onKey = e => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
    if (!enabled() || typing(e.composedPath?.()[0] ?? e.target)) return;
    const inDetail = !!current();
    const action = keyAction(e.key, inDetail);
    if (!action) return;
    if (action.type === 'step') { if (step(action.dir)) e.preventDefault(); return; }
    if (action.type === 'back') { e.preventDefault(); go(null, 0); return; }
    const items = [...root.querySelectorAll(rows)];
    if (!items.length) return;
    const at = items.indexOf(root.activeElement);
    const to = at < 0 ? (action.dir > 0 ? 0 : items.length - 1) : Math.min(items.length - 1, Math.max(0, at + action.dir));
    e.preventDefault();
    items[to].focus();
  };

  let start = null;
  const onStart = e => {
    start = null;
    if (e.touches.length !== 1 || (win.visualViewport?.scale ?? 1) > 1.01) return;
    if (swipeBlocked(e.composedPath?.() ?? [], win)) return;
    const t = e.touches[0];
    start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
  };
  const onEnd = e => {
    const from = start;
    start = null;
    const t = e.changedTouches?.[0];
    if (!from || !t || !enabled() || !current()) return;
    const dir = swipeStep(from, { x: t.clientX, y: t.clientY, t: e.timeStamp }, win.innerWidth);
    if (dir) step(dir);
  };
  const onCancel = () => { start = null; };

  win.addEventListener('keydown', onKey);
  doc.addEventListener('touchstart', onStart, { passive: true });
  doc.addEventListener('touchend', onEnd, { passive: true });
  doc.addEventListener('touchcancel', onCancel, { passive: true });
  return () => {
    win.removeEventListener('keydown', onKey);
    doc.removeEventListener('touchstart', onStart);
    doc.removeEventListener('touchend', onEnd);
    doc.removeEventListener('touchcancel', onCancel);
  };
}
