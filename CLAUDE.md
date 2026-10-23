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
- `scripts/vos-changelog/` — gemeinsamer Vite-Plugin mit eingebetteten Release-Metadaten; in VitalOS zeigt nur die Shell den gebündelten Dialog.
- `APP.md` — Produktverhalten, Release-Notizen und laufender Änderungsverlauf.
  Neue App- und Release-Änderungen dort ergänzen.
- `mini-app.json` + `scripts/mini-app-shell/` (vendored aus
  `~/vitalos/packages/mini-app-shell`, nicht editieren; Drift: `pnpm run vendor:check`) —
  `pnpm run build` erzeugt Manifest, Splash, Service Worker (`sw.js`) und Register-Snippet.
- `public/` — Icons (Pfeil nach oben, Lime), Manifest-Quelle.

## Daten

Eigenständiger Katalog: `public/skills-catalog.v1.json` (14 Skills / 65 Stufen).
`data/` besitzt Modell, IndexedDB, localStorage und Firestore-Sync.
Vertrag, Migration, Rules-Integration und Prüfungen: `docs/SKILLS-DATA.md`.
Legacy-Fitness-Keys dienen nur der einmaligen, nicht destruktiven Übernahme.
Firestore-Namespace: `skillsUsers/{uid}/events`, Katalog: `skillsCatalogs`.
Runner bleibt lokal; ein Stufenindex allein bedeutet keine Meisterschaft.

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
