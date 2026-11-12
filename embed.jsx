import { useEffect, useRef } from 'react';
import SkillsCard from './SkillsCard.jsx';
import DesignHost from './designs/DesignHost.jsx';
import { DESIGNS } from './designs/index.js';
import { notifyEmbeddedRoute } from './designs/core.js';
import './skills.css';

// Shell entry. Standalone keeps using main.jsx (document theme, ?skill= hash).
// `route` is '' or a skill id. The shell maps that to #skills/<skillId>.
// `onNavigate` is for other shell apps; skill open/close uses onRouteChange.
// `uid` is the shell account. The store still follows shared Firebase auth.
export function SkillsEmbed({
  uid,
  embedded = true,
  route = '',
  onRouteChange,
  onNavigate,
  onWorkoutComplete,
  design,
} = {}) {
  void uid;
  void onNavigate;
  const published = route || '';
  const routeRef = useRef(published);
  const committedRef = useRef(published);
  const pendingRef = useRef(null);
  const onRouteChangeRef = useRef(onRouteChange);
  onRouteChangeRef.current = onRouteChange;
  // Designs read the route synchronously inside setHash. Keep that value until
  // the host publishes it; a later host route always wins.
  if (embedded) {
    if (published !== committedRef.current) {
      committedRef.current = published;
      routeRef.current = published;
      pendingRef.current = null;
    } else if (pendingRef.current === null) {
      routeRef.current = published;
    }
  }
  const routeBridge = useRef({
    get: () => routeRef.current,
    set: (id) => {
      const next = id || '';
      pendingRef.current = next;
      routeRef.current = next;
      onRouteChangeRef.current?.(next);
    },
  }).current;
  const variant = DESIGNS.find(item => item.id === design) || null;

  useEffect(() => {
    if (!embedded || !variant) return undefined;
    notifyEmbeddedRoute();
    return undefined;
  }, [embedded, variant, published]);

  return (
    <div
      data-skills-embed=""
      data-theme={embedded ? 'skills' : undefined}
      style={embedded ? { background: variant?.bg || 'var(--bg)', minHeight: '100%' } : undefined}
    >
      {variant ? (
        <DesignHost
          key={variant.id}
          design={variant}
          embedded={embedded}
          routeBridge={embedded ? routeBridge : null}
          onWorkoutComplete={onWorkoutComplete}
        />
      ) : (
        <div className="max-w-xl mx-auto">
          <SkillsCard
            embedded={embedded}
            route={published}
            onRouteChange={onRouteChange}
            onWorkoutComplete={onWorkoutComplete}
          />
        </div>
      )}
    </div>
  );
}

export default SkillsEmbed;
