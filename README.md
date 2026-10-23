# Skills

Eigenständige Calisthenics-App mit versioniertem Skills-Katalog, Trainingsrunner
und nutzerbezogener Progression. Fitness bindet `SkillsCard.jsx` aus dem direkten
Git-Submodule ein; der Datenbestand gehört ausschließlich Skills.

Katalog: `public/skills-catalog.v1.json` (14 Skills / 65 Stufen). Fortschritt und
Runner liegen in IndexedDB und localStorage, angemeldete Nutzer synchronisieren
Fortschrittsereignisse über Firestore. Die alten Fitness-Keys werden nur zur
Bestandsübernahme gelesen. Skill-URL: `?skill=<id>` im Hash.

## Standalone (2026-10-16)
Dieses Repo ist die herausgelöste Fassung (`git subtree split` aus `~/fitness-dev`, Ordner `Skills/`).
Start: `pnpm install && pnpm run dev`; Build mit Service Worker/Splash: `pnpm run build`.
`pnpm run firebase` baut und deployt zu Firebase; `pnpm run deploy` deployt das vorhandene `dist/` ohne Build-Schritt.
Produktverhalten und laufender Änderungsverlauf: `APP.md`. Agent-/Repo-Details: `CLAUDE.md`.

## Übungsvideos (2026-10-17)

Alle 66 unterschiedlichen Progressions- und Conditioning-Übungen haben eine
Videozuordnung: 50 kurze externe H.264-Demos (ca. 3–36 Sekunden) und 16
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


## Eigenständige Skills-Daten (2026-10-23)

Der neue Datenbestand liegt in `public/skills-catalog.v1.json`. Progression,
Offline-Speicherung und Firebase-Sync gehören vollständig der Skills-Domain.
Siehe [Datenvertrag und Bereitstellung](docs/SKILLS-DATA.md) für Schema,
Migration, Regeln und Tests. Der alte Fitness-Katalog ist keine Laufzeitquelle.
