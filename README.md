# Skills

Eigenständige Calisthenics-App mit versioniertem Skills-Katalog, Trainingsrunner
und nutzerbezogener Progression. Fitness bindet `SkillsCard.jsx` über den
Nachbar-Checkout (`skills-app`/`skills-dev`, `vite-miniapp-submodules.mjs`) ein;
der Datenbestand gehört ausschließlich Skills.

Katalog: `public/skills-catalog.v1.json` (14 Skills / 65 Stufen). Fortschritt und
Runner liegen in IndexedDB und localStorage, angemeldete Nutzer synchronisieren
Fortschrittsereignisse über Firestore. Die alten Fitness-Keys werden nur zur
Bestandsübernahme gelesen. Standalone-Skill-URL: `?skill=<id>` im Hash.
Die VitalOS-Shell bindet stattdessen `embed.jsx` ein (Vertrag unten).

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
Integration: Fitness mappt `src/views/Skills` auf den Sibling-Checkout
(`skills-dev` / `skills-app`) — kein `Skills/`-Gitlink, kein `origin/fitness`.
Entwicklungsquelle: `~/dev/skills-dev` Branch `dev`; Freigabe für Fitness und
Standalone ist `master`. Shell-Pin: `~/vitalos/skills-app` auf `origin/master`.
Keine UI-Dateien nach Fitness kopieren.


## Eigenständige Skills-Daten (2026-10-23)

Der neue Datenbestand liegt in `public/skills-catalog.v1.json`. Progression,
Offline-Speicherung und Firebase-Sync gehören vollständig der Skills-Domain.
Siehe [Datenvertrag und Bereitstellung](docs/SKILLS-DATA.md) für Schema,
Migration, Regeln und Tests. Der alte Fitness-Katalog ist keine Laufzeitquelle.

## Shell-Embed (`embed.jsx`)

`SkillsEmbed` (auch Default-Export) ist der Eintrag für die VitalOS-Shell
(`skills-app`, Hülle `src/shell/SkillsApp.jsx`). Standalone bleibt `main.jsx`:
`document.documentElement[data-theme="skills"]`, Skill-URL `?skill=<id>` im Hash,
Hosting `vos-skills.web.app`. Die Shell importiert `embed.jsx` und `skills.css`.

| Prop | Vertrag |
|---|---|
| `uid` | Konto der Shell. Skills schaltet den Store damit nicht um; der Owner bleibt die gemeinsame Firebase-Auth. |
| `embedded` | Default `true`. Ohne die globalen Seiteneffekte unten. `false` verhält sich wie die Standalone-Karte. |
| `route` | `''` (Liste) oder `'<skillId>'`. Die Shell bildet daraus `#skills/<skillId>`. |
| `onRouteChange(route)` | Skill geöffnet oder zurück zur Liste. Ersetzt Hash und `history.replaceState`. |
| `onNavigate(target)` | Shell-Ziele außerhalb von Skills (andere Apps). Skill-Wechsel laufen nicht hierüber; diese Oberfläche ruft ihn nicht auf. |
| `onWorkoutComplete(workout)` | Abschluss an den Host. |
| `design` | `classic` oder weggelassen: `SkillsCard`. `a` / `b` / `c`: Shadow-DOM-Variante. Alle vier laufen eingebettet. |

Im eingebetteten Modus schreibt Skills nicht auf:

- `document.documentElement[data-theme]` — das Theme hängt am Embed-Container (`data-theme="skills"`, Hintergrund der Variante ebenfalls dort)
- `html.style.background` und `meta[name="theme-color"]`
- `location.hash` und `history.replaceState`

Schriften der Varianten bleiben ein Stylesheet-`<link>` in `document.head`, weil `@font-face` im Shadow-DOM nicht aus dem Host greift.

### Abschluss, eine Zustellung

`toHostWorkout` setzt `runId` auf `sessionData.sessionId` (neben `id: skills-<sessionId>` und `sourceSessionId`). Der Host legt damit genau ein Session-Dokument an. Dieselbe Einheit liefert bei Wiederholung dieselbe `runId`.

Genau ein Weg, damit Callback und Event nicht doppelt schreiben:

1. **Karte** (`SkillsCard`): nur `onWorkoutComplete`. Kein Window-Event.
2. **Designs:** `deliverHostWorkout`. Solange das Embed einen `onWorkoutComplete` hält, geht der Abschluss nur dorthin und `skills:workout-completed` wird nicht gesendet. Ohne Callback bleibt das Event (Standalone und Hosts, die nur zuhören).

Prüfen: `node tests/embed.test.mjs`.
