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
