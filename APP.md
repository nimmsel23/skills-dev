# Skills App

Standalone-Calisthenics-App und eingebettete Skill-Oberfläche für Fitness.
Die Progressionen, Videozuordnungen und Trainingsläufe werden gemeinsam mit
`SkillsCard.jsx` gepflegt. Die bestehende Fitness-Integration importiert diese
Oberfläche direkt aus dem Skills-Git-Submodule.

## In-App-Update-Changelog

Die App zeigt beim ersten Öffnen einer neuen Release-ID einen Dialog mit den
Commits des Updates. Commit-Titel verlinken direkt auf GitHub; ein weiterer
Link öffnet den vollständigen Commit-Verlauf. „Weiter“ speichert die bestätigte
Release-ID im Browser unter `skills:seen-release`. Der gemeinsame Release-Dialog wird
danach nicht erneut angezeigt.

Der gemeinsame Vite-Plugin in `scripts/vos-changelog/` bettet die Release-Daten
beim Build ein und erzeugt zusätzlich `release-info.json`. Die Bestätigung
bleibt unter `skills:seen-release`. Eingebettet in VitalOS wird kein eigener
Dialog geöffnet; dort zeigt die Shell alle App-Änderungen einmal gebündelt.

## Daten und Oberfläche

- `SkillsCard.jsx` enthält den gemeinsamen Skills-Bildschirm und Runner.
- `ExerciseVideo.jsx` und `exerciseVideos.json` ordnen die Demos und Tutorials zu.
- `main.jsx` setzt das Skills-Theme und ergänzt den Update-Dialog.
- Fortschritt und aktive Workouts verwenden weiter `fitness-skills-progress-v1`
  und `fitness-skills-active-runner-v1`.
- Die Skill-URL bleibt `?skill=<id>` im Hash.

## Build und Release

- `pnpm run firebase` baut und deployt nach `vos-skills.web.app`.
- `pnpm run deploy` deployt das vorhandene `dist/` ohne Build.
- Fitness verwendet das Git-Submodule `Skills/` auf Branch `fitness`.
- Fitness-Production wird über `fitness-dev` und den Release-Branch
  `fitness-app/vitalos` integriert; der VitalOS-Parent pinnt anschließend den
  konkreten `fitness-app`-Commit.

## Änderungsverlauf

### 2026-10-20

- Update-Dialog für neue Releases ergänzt. Die Commits des Updates werden aus
  dem GitHub-Push-Event angezeigt und lassen sich über den Dialog öffnen.
- Release-Metadaten werden vor `dev` und Build automatisch generiert; der lokale
  Bestätigungsstand liegt unter `skills:seen-release`.
- `firebase` führt Build und Deploy aus; `deploy` deployt ein vorhandenes
  `dist/` ohne Build.
- `.gitignore` um lokale Env-Dateien, Logs, Build-Artefakte und Toolzustände
  erweitert.

Neue Produkt- und Release-Änderungen werden ab jetzt hier ergänzt.

## 2026-10-21

Gemeinsamen VitalOS-Changelog statt eigenem UpdateNotes-Dialog eingebunden; kein separater Fetch neuerer Metadaten neben einem gecachten Bundle.

## 2026-10-23

Design-Phase: neben der bestehenden Karte („Original“) gibt es drei Varianten
in `designs/` — A „Iron Room“ (brutalistisch), B „Gravity Map“ (Sternkarte),
C „Riso Climb“ (hell, Risodruck). Ein schwebender Button unten rechts schaltet
um; die Wahl liegt in `skills:design` (URL-Override `?design=classic|a|b|c`).

- Alle Varianten lesen und schreiben `fitness-skills-progress-v1` in derselben
  Struktur wie `SkillsCard.jsx` (Stufe, Verlauf, Sessions inkl. Auto-Aufstieg
  bei erreichtem Ziel); Wechsel zwischen den Designs verliert nichts.
- Skills und Workout-Blöcke kommen aus `SkillsCard.jsx` (neue Named Exports
  `SKILLS`, `buildWorkoutBlocks`) — keine zweite Datenquelle.
- Jede Variante läuft als Vanilla-Modul in einem Shadow-DOM (kein CSS-Leck in
  Original oder Fitness); Schriften kommen von Google Fonts (offline Fallback).
- Enthalten: Liste, Detail mit Kette/Verlauf/Videos, geführter Runner (Primär,
  Sekundär, Conditioning, Reps-Korrektur, +30s, RPE, Speichern). Nur im
  Original: Charts, Hold-Timer, Satz-Archiv, Fortsetzen eines unterbrochenen
  Workouts.
- Der Switcher blendet sich während eines laufenden Workouts in einer Variante aus.
