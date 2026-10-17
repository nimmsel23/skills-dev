# Skills

Calisthenics-Skills als eigener Feature-Ordner. `src/views/Session/index.jsx` bindet `SkillsCard.jsx` im Skills-Subtab ein; `src/styles.css` lädt `skills.css`. Tailwind scannt diesen Ordner separat.

Fortschritt und unterbrochene Workouts bleiben in den bestehenden localStorage-Keys `fitness-skills-progress-v1` und `fitness-skills-active-runner-v1`. Der Umzug ändert weder diese Daten noch die Skill-URL (`?skill=<id>` im Hash).

Die Skill- und Progressionsliste liegt derzeit noch in `SkillsCard.jsx`; die Calisthenics-YAMLs im Katalog sind eine zweite Quelle. Ein eigenständiges Deployment ist für Skills bislang nicht eingerichtet.

## Standalone (2026-10-16)
Dieses Repo ist die herausgelöste Fassung (`git subtree split` aus `~/fitness-dev`, Ordner `Skills/`).
Start: `pnpm install && pnpm run dev`; Build mit Service Worker/Splash: `pnpm run build`.
Details: `CLAUDE.md`.

## Übungsvideos (2026-10-17)

Alle 65 unterschiedlichen Progressions- und Conditioning-Übungen haben eine
Videozuordnung: 50 kurze externe H.264-Demos (ca. 3–36 Sekunden) und 15
YouTube-Tutorials. Im Skill-Detail kann jede Stufe über „Video“ angesehen
werden, auch vor ihrer Freischaltung. Das ändert keine Trainingsstufe.
Der aktuelle Schritt zeigt seine Demo zusätzlich direkt vor dem Workout-Start.
Im Runner starten kurze Demos automatisch stumm in Schleife; Tutorials erst
auf Wunsch. Bei Pausen, Blockwechsel und Verlassen wird der Player entfernt.

Quellen und Zuordnung: `exerciseVideos.json`; gemeinsamer Player:
`ExerciseVideo.jsx`. Die Clips werden von den Originalservern geladen, nicht
lokal gespeichert oder offline mitgeliefert. Quellenlinks und ergänzende
Skill-Tutorials bleiben sichtbar. Bei Medienfehlern bleibt der Runner benutzbar.
Details und Abnahmegrenzen: [docs/EXERCISE-VIDEOS.md](docs/EXERCISE-VIDEOS.md).

Prüfen: `node scripts/test-exercise-videos.mjs`, anschließend `pnpm run build`.
Integration: Fitness importiert `Skills/SkillsCard.jsx` direkt aus dem
Submodule `Skills/` (Branch `fitness` desselben Repos). `~/skills-dev/dev`
ist die Entwicklungsquelle. Vor einem Fitness-Gitlink-Push den zugehörigen
Skills-Commit nach `origin/fitness` pushen; keine UI-Dateien kopieren.
Production-Releases pinnen diesen Gitlink über `~/vitalos/fitness-app`.
Der VitalOS-Workflow `deploy-skills.yml` baut denselben verschachtelten
Checkout für `vos-skills.web.app`; `deploy-fitness.yml` baut den Fitness-Host.
