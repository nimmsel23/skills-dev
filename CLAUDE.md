# CLAUDE.md — skills-dev

Standalone-App für die Calisthenics-Skills (Progressionen, Workout-Runner,
Verlauf). Herausgelöst am 2026-10-16 aus `~/fitness-dev` (`Skills/`) per
`git subtree split --prefix=Skills` — die drei Commits, die `Skills/` berührt
haben, sind die Historie dieses Repos (Basis `c514177`).

## Aufbau

- `SkillsCard.jsx` — die gesamte Skill-Logik und -Oberfläche (Default-Export,
  optionale Prop `onWorkoutComplete(workout)`), `skills.css` — Theme
  `[data-theme="skills"]` (Lime `#c8ff00`) + Slider-Styles.
- `main.jsx` — Standalone-Hülle: setzt `data-theme="skills"` und rendert die Karte.
  Kein Sync ins Session-Log (anders als `6pack-dev/standaloneSync.js`).
- `mini-app.json` + `scripts/mini-app-shell/` (vendored aus
  `~/vitalos/packages/mini-app-shell`, nicht editieren; Drift: `pnpm run vendor:check`) —
  `pnpm run build` erzeugt Manifest, Splash, Service Worker (`sw.js`) und Register-Snippet.
- `public/` — Icons (Pfeil nach oben, Lime), Manifest-Quelle.

## Daten

`localStorage`-Keys bleiben identisch zur Fitness-App: `fitness-skills-progress-v1`,
`fitness-skills-active-runner-v1`; Skill-URL `?skill=<id>` im Hash. Die Skill-/
Progressionsliste steht noch in `SkillsCard.jsx`; die Calisthenics-YAMLs in
`~/fitness-dev/fitness/catalog/kb/exercises/calisthenics/` sind eine zweite Quelle
(siehe README).

## Befehle

`pnpm install`, `pnpm run dev` (Vite), `pnpm run build` (inkl. Stempel),
`pnpm run deploy` (Build + `firebase deploy --only hosting:skills`).

## Deploy / Betrieb (Stand 2026-10-16: lokal angelegt, nichts veröffentlicht)

- Firebase: `.firebaserc` Ziel `skills` → Site `vos-skills` im Projekt `fitness-aos`.
  Die Site existiert noch nicht (`firebase hosting:sites:create vos-skills` +
  `firebase target:apply hosting skills vos-skills`).
- GitHub: Remote `nimmsel23/skills-dev` ist noch nicht angelegt. `deploy.yml` deployt
  bei Push auf `dev`; ohne Secret `FIREBASE_SERVICE_ACCOUNT_FITNESS_AOS` nur Build.
- `.githooks/pre-push` = Build-Check (aktiv über `core.hooksPath`).
- Claude-Doku-Hooks: `.claude/hooks/` (identisch mit fitness-dev/coach-dev/plan-dev/6pack-dev).
- Nach Anlage nötig: in `~/fitness-dev` und `~/vitalos` als Submodul einhängen
  (wie `6pack`/`coach`/`plan`) und `vos-release` um `skills` ergänzen.
