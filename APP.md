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
- `data/` speichert Fortschritt und Runner in IndexedDB/localStorage und
  synchronisiert Fortschrittsereignisse über Firestore. Alte Fitness-Keys
  bleiben als Migrationsquelle erhalten.
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


## 2026-10-23 — Eigenständige Skills-Progression (Worktree)

- Versionierter Katalog mit 14 Skills, 65 festen Stufen-IDs, Technik, Equipment,
  Messgrößen und eigenen Aufstiegskriterien; Beine und Balance als Kategorien.
- IndexedDB als lokaler Datenbestand, localStorage als Wiederherstellung und
  Service Worker mit vollständigem App-/Katalog-Precache.
- Nutzergetrennte Firestore-Ereignisse mit automatischem Sync, Google-Anmeldung,
  Offline-Queue und ausdrücklich wählbarer Übernahme lokaler Daten.
- Keine automatische Meisterschaft durch Erreichen der letzten Stufe;
  zwei saubere Trainings an verschiedenen Tagen als Aufstiegsempfehlung.
- Alte Daten bleiben erhalten. Workout-Abschluss erst nach erfolgreichem Speichern.
- Bereitstellungsgrenze: Rules-Integration, Katalog-Seed und Live-Release stehen
  separat aus. Datenvertrag und Abnahme: `docs/SKILLS-DATA.md`.

### Präzisierung: Speicherung ohne Login

Ohne Login ausschließlich localStorage und IndexedDB; kein anonymer Zugang und
kein Firestore-Sync. Erst ein angemeldetes Konto aktiviert den automatischen Sync.

## 2026-10-23

Design-Phase: neben der bestehenden Karte („Original“) gibt es drei Varianten
in `designs/` — A „Iron Room“ (brutalistisch), B „Gravity Map“ (Sternkarte),
C „Riso Climb“ (hell, Risodruck). Ein schwebender Button unten rechts schaltet
um; die Wahl liegt in `skills:design` (URL-Override `?design=classic|a|b|c`).

- Alle Varianten verwenden über `data/designProgress.js` denselben
  IndexedDB-/localStorage-Datenbestand wie `SkillsCard.jsx`. Firestore-Sync
  läuft ausschließlich nach Login. Stufenwechsel werden ausdrücklich bestätigt.
- Skills und Workout-Blöcke kommen aus `SkillsCard.jsx` (neue Named Exports
  `SKILLS`, `buildWorkoutBlocks`) — keine zweite Datenquelle.
- Jede Variante läuft als Vanilla-Modul in einem Shadow-DOM (kein CSS-Leck in
  Original oder Fitness); Schriften kommen von Google Fonts (offline Fallback).
- Enthalten: Liste, Detail mit Kette/Verlauf/Videos, geführter Runner (Primär,
  Sekundär, Conditioning, Reps-Korrektur, +30s, RPE, Speichern). Unterbrochene Workouts bleiben auch in den Varianten gespeichert.
  Nur im Original: Charts, Hold-Timer und Satz-Archiv.
- Der Switcher blendet sich während eines laufenden Workouts in einer Variante aus.


Integration beider Arbeitsstände: alle Designs nutzen den neuen versionierten
Katalog, ausdrückliche Meisterschaft und erfolgreiche Speicherung vor Runner-Löschung.


### Produktionsrelease 2026-10-23

Skills `acdbfd7` ist über Fitness/VitalOS live veröffentlicht. Die zentralen
Skills-Firestore-Regeln und der Katalog `calisthenics-v1` sind deployed.
Hosting, Rules/Katalog und die zugehörigen Fitness-/Shell-CIs sind erfolgreich.
Ohne Login bleiben die Trainings lokal; angemeldet steht Auto-Sync bereit.
