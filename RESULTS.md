## 2026-10-21 — Gemeinsamer Changelog

Universalisierten VitalOS-Release-Dialog über vendorte Vite-Module eingebunden. Standalone mit eigener Bestätigung; eingebettet unterdrückt zugunsten des zentralen Shell-Dialogs.

## 2026-10-17 — Direkte Fitness-Integration

Fitness ersetzt die identische frühere Skills/-Kopie durch ein direktes Submodule auf Branch fitness. Die Standalone-Quelle bleibt skills-dev/dev. Beide Production-Builds verwenden denselben gepinnten Skills-Commit über vitalos/fitness-app.

## 2026-10-17 — Videos für alle Skills-Übungen

- Alle 14 Skills / 65 unterschiedliche Progressions- und Conditioning-Übungen: 50 kurze native H.264-Demos plus 15 ausdrücklich gekennzeichnete Tutorials, mit Originalquellen. Keine fremden Clips kopiert.
- Vorschau der aktuellen und späterer Stufen; Anschauen ändert keine Freischaltung. Native Demos im Runner automatisch stumm als Loop; keine Medien in Pausen oder nach Verlassen. Timer, Sätze und Fortschrittsdaten bleiben unverändert.
- Tatsächliche Komponenten-/Runner-Regressionstests, HTTP-/ffprobe-Prüfung aller 50 Clips, oEmbed-Prüfung aller Tutorial-Quellen und Standalone-Build erfolgreich. Handy-Abnahme offen.
- Source nur skills-dev; Fitness hat derzeit noch eine eigene Skills/-Kopie. Kein Production-Deploy Teil dieser Aufgabe. Vollständige Zuordnung: docs/EXERCISE-VIDEOS.md.

# RESULTS — skills-dev

## 2026-10-16: Repo angelegt
Aus `~/fitness-dev` per `git subtree split --prefix=Skills` herausgelöst (Historie:
3 Commits), als Standalone-Mini-App nach dem Muster von `6pack-dev` aufgesetzt:
Vite/React/Tailwind, `mini-app.json` + vendored `mini-app-shell` (Splash, Service Worker,
Register), Icons, `firebase.json`/`.firebaserc` (Ziel `skills` → `vos-skills`),
Deploy-Workflow, Build-Check-Hook, Claude-Doku-Hooks. `pnpm run build` grün.
Nichts gepusht, keine Firebase-Site und kein GitHub-Repo angelegt.


## 2026-10-23 — Eigenständiges Skills-Dataset und Persistenz

Worktree `.worktrees/skills-progression`, Branch `feat/skills-progression`.
14 Skills / 65 Stufen mit stabilen IDs, Technik, Equipment und expliziten
Aufstiegsregeln. Ereignismodell mit idempotenter Legacy-Migration, kontogetrenntem
IndexedDB/localStorage, Firestore-Sync und wiederaufnehmbarem Runner.
Worker precacht Bundles und Katalog und schreibt den Katalog in dieselbe IDB.
Letzte Stufe und Meisterschaft getrennt; keine automatische Freischaltung.

Prüfung: Modell/Katalog, lokale Persistenz/Migration, Sync-Controller,
Firestore-Emulator-Zugriffsregeln, Medienchecks und gebauter Worker.
Produktions-Rules/Seed/Release und echte Geräteabnahme bleiben getrennte Schritte;
siehe `docs/SKILLS-DATA.md`.

2026-10-23: Bezeichnungen präzisiert: Ohne Login ausschließlich lokal in
localStorage/IndexedDB. Kein anonymes Firebase-Konto; Sync nur nach Anmeldung.


### Vorbereitung der Design-Integration

Gemeinsamer `designProgress`-Adapter und wiederverwendbare Speicher-/Login-Anzeige.
Adapter-Tests prüfen dauerhafte Speicherung vor Runner-Löschung, stabile IDs,
explizite Meisterschaft und Fehlererhalt. `scripts/test-design-integration.mjs`
kann einen separaten Vorschaupfad prüfen. Vorabprüfung der uncommitteten
Designvarianten A/B/C in `/tmp/skills-merge-prep/preview`: Build und DOM-Tests für
alle Kategorien, Stufenwechsel, Meisterschaft, Rückstufung, Speicherfehler und
Trainingsnachweise bestanden. Hauptarbeitsverzeichnis dabei unverändert.


### Integration nach Claudes Design-Commit

Nach `bf8cd0e` Skills-Worktree in `dev` zusammengeführt. Die Designvarianten
verwenden den gemeinsamen Ereignisspeicher mit fünf Kategorien, ausdrücklicher
Meisterschaft und wartendem Trainingsabschluss bei Speicherfehlern. Anmeldung,
Speicherstatus und Technik-/Unterstützungsbestätigung sind auch dort verfügbar.
Die Runner-Sicherung bleibt kontolokal; ein später Cleanup kann keine Runnerdaten
in ein inzwischen anderes Konto schreiben.


### Produktionsrelease 2026-10-23, 15:35 Europe/Vienna

- Skills `acdbfd7` auf `origin/dev` und `origin/fitness`; Fitness `f221e52`
  auf `vitalos`; VitalOS-Parent `ed6a7c3` auf `master` veröffentlicht.
- Skills-, Fitness-, Shell- und VOS-Fitness-Deployments erfolgreich in CI.
- Zentrale Firestore-Regeln und `skillsCatalogs/calisthenics-v1` veröffentlicht;
  Regeltests des kombinierten Rulesets und zweimaliger Seed im Emulator bestanden.
- Live https://vos-skills.web.app: HTTP 200, Release-ID `acdbfd7`, Katalog mit
  14 Skills / 65 Stufen identisch zum Quellstand; aktuelles JS und Worker-Precache
  für Katalog und Bundles nachgewiesen. Keine anonyme Anmeldung; ohne Login lokal.
- Hosting-CI: https://github.com/nimmsel23/vitalos/actions/runs/39962182296
- Rules/Katalog: https://github.com/nimmsel23/vitalos/actions/runs/39962251260
- Echte Nutzeranmeldung und Zweigeräte-Sync wurden nicht im Browser abgenommen.
