# CLAUDE.md — skills-dev

Standalone-App für die Calisthenics-Skills (Progressionen, Workout-Runner,
Verlauf). Herausgelöst am 2026-10-16 aus `~/fitness-dev` (`Skills/`) per
`git subtree split --prefix=Skills` — die drei Commits, die `Skills/` berührt
haben, sind die Historie dieses Repos (Basis `c514177`).

## Aufbau

- `SkillsCard.jsx` — die gesamte Skill-Logik und -Oberfläche (Default-Export,
  optionale Prop `onWorkoutComplete(workout)`), `skills.css` — Theme
  `[data-theme="skills"]` (Lime `#c8ff00`) + Slider-Styles.
- `main.jsx` — Standalone-Hülle: setzt `data-theme="skills"`, rendert die Karte
  und zeigt Release-Notizen für noch nicht bestätigte Updates.
- `scripts/write-release-info.mjs` — erstellt die Release-Metadaten für Dev und Build.
- `APP.md` — Produktverhalten, Release-Notizen und laufender Änderungsverlauf.
  Neue App- und Release-Änderungen dort ergänzen.
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
`pnpm run firebase` (Build + `firebase deploy --only hosting:skills`),
`pnpm run deploy` (deployt das vorhandene `dist/` ohne Build-Schritt).

## Integration und Release (2026-10-17)

- Entwicklung: `~/skills-dev`, Branch `dev`.
- Fitness: direktes Git-Submodule `Skills/`, Branch `fitness`; Importpfade bleiben unverändert. Keine Dateien manuell nach Fitness kopieren.
- Release-Vessel: `~/vitalos/fitness-app/Skills`, gepinnt durch den Fitness-Gitlink.
- Erst Skills `dev` und `fitness` pushen, dann Fitness-Gitlink committen/pushen und im VitalOS-Fitness-Release übernehmen.
- Production nur über VitalOS-CI: `deploy-skills.yml` für `vos-skills`, `deploy-fitness.yml` für Fitness.
- Vor Änderungen Gitstatus/Branch/Pointer prüfen, fremde Daten und Änderungen erhalten.

## Übungsvideos

`exerciseVideos.json` ist die explizite Medienzuordnung für alle Progressionen
und Conditioning-Übungen. `ExerciseVideo.jsx` wird von Vorschau und Runner
genutzt: kurze native Demos automatisch nur im Runner; Tutorials auf Wunsch.
Quellen und Prüfgrenzen: `docs/EXERCISE-VIDEOS.md`. Bei Übungsumbenennungen
`node scripts/test-exercise-videos.mjs` ausführen und den Katalog mitziehen.
