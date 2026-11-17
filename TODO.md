# TODO — skills-dev

## Core Skills (Skills + 6Pack), Stand 2026-11-17

- [x] 2026-11-14: Skills und vollständiges 6Pack als Core Skills zusammengeführt (`f84d966`); `CoreSkills.jsx` bindet `SixPackEmbed` aus `6pack-dev` ein, keine UI-Kopie. Routen `#`, `#<skill-id>`, `#sixpack`, `#sixpack/track`, `#settings`.
- [x] 2026-11-14: `/6pack` und `/sixpack` führen in derselben App zu 6Pack (`4878251`).
- [x] 2026-11-14: Kontrollierter Modus (`route`/`onRouteChange`/`onClose`) für die Einbettung in Fitness (`2f503b8`); eingebettet kein 6Pack-Push (`6098a12`).
- [x] 2026-11-15: CI generiert 6Pack-Daten vor dem Build; Promote/Deploy nur bei grünem Check für genau den SHA (`422fe84`).
- [x] 2026-11-17: Fitness lädt Core Skills statisch statt per `React.lazy` (fitness-dev, Regel „Keine Dynamic Imports“).
- [ ] Core Skills auf dem Handy abnehmen: Wechsel Skills ↔ 6Pack ↔ Setup, 6Pack-Runner (Ansagen, Wake Lock, Musik) innerhalb von Core Skills, Zurück nach Fitness.
- [ ] Gemeinsamer Login/Sync von Skills- und 6Pack-Daten auf zwei Geräten prüfen (Owner-Gate).


- [x] 2026-10-17: Videos für alle Skills-Progressionen und Conditioning-Übungen: Vorschau und Runner.
- [ ] 15 Tutorial-Zuordnungen bei Gelegenheit um exakte kurze Demo-Loops ergänzen.
- [ ] Wiedergabe/Autoplay auf dem Handy abnehmen.
- [x] 2026-11-11: Standalone-Skills-Quelle und Fitness-`Skills/`-Merge — erledigt als Sibling-Checkout (`vite-miniapp-submodules.mjs` → `skills-app`/`skills-dev`); kein Gitlink/`origin/fitness` mehr (lokal `fitness` 98 behind `master`).

- [x] 2026-10-23: Eigenständigen Calisthenics-Katalog, Progressionsmodell,
  IndexedDB/localStorage und automatischen Firestore-Sync im Worktree bauen.
- [x] 2026-10-23: Gemeinsame Produktions-Rules um Skills-Vertrag erweitern; Katalog seeden (`docs/SKILLS-DATA.md`, VitalOS-Runs 39962182296 / 39962251260).
- [x] 2026-11-11: Offline-Codepfad re-verifiziert (Testsuite grün; `vite build` + `test:sw` — Worker precache/IDB/Offline-Katalog; Tip `c966a90`, Live Deploy `42954958915`).
- [ ] Echten Offline-/Zweigeräte-Sync mit Anmeldung abnehmen (Owner-Gate; `docs/SKILLS-DATA.md` Release Schritt 4).
- [x] 2026-11-10: Debug-APK GitHub-Release `android-latest` hinter Tip ziehen (`70c640f`, sha256 `0144c5af…`; Org-Task `b559bbe6` done).
