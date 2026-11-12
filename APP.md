# Skills App

Standalone-Calisthenics-App und eingebettete Skill-Oberfläche für Fitness.
Die Progressionen, Videozuordnungen und Trainingsläufe werden gemeinsam mit
`SkillsCard.jsx` gepflegt. Fitness löst die Oberfläche über den Nachbar-Checkout
(`skills-app`/`skills-dev`) mit `vite-miniapp-submodules.mjs` auf — kein
verschachteltes `Skills/`-Git-Submodule mehr.

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
- Fitness nutzt den Sibling-Checkout (`skills-dev` lokal / `skills-app` in VitalOS)
  auf Branch `master`; Shell-Pin über `vos-release`/`vos-ship`.
- Standalone-Release: `dev` → `master` (Auto-Promote). Branch `fitness` ist Legacy.

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

## 2026-10-29 — Login/Sync im Footer

Konto-, Login- und Sync-Steuerung (`PersistenceStatus`) steht jetzt am Seitenende (Footer) statt oben: in der Original-Karte unter der Skill-Liste, in den Design-Varianten unter dem Design-Host.

## 2026-10-30 — Host-Callback für Design-Varianten

Alle drei Vanilla-Designs senden nach erfolgreicher Skills-Persistierung das
Event `skills:workout-completed`. Der Payload entspricht dem optionalen
`onWorkoutComplete(workout)`-Callback der React-Karte; VitalOS kann dadurch auch
bei den alternativen Designs das Workout ins Fitness-Tageslog übernehmen.

## 2026-10-30 — Swipe- und Tastaturnavigation

Neues gemeinsames Modul `navigation.js` für die Original-Karte und alle drei Designs.

- **Detailansicht:** Wischen nach links/rechts oder `→`/`←` wechselt zum nächsten/vorherigen Skill (Reihenfolge wie in der Liste, nach Kategorie gruppiert, kein Umbruch an den Enden). `Esc` führt zurück zur Liste.
- **Liste:** `↑ ↓ ← →` bewegen den Fokus über die Zeilen, `Enter` öffnet.
- **Original-Karte:** zusätzlich Pager (`‹ 3/14 ›`) neben „Skills“ und kurze Slide-Animation beim Wechsel.
- **Schutz:** Navigation ist gesperrt, solange ein Workout läuft oder gespeichert wird. Wischen ignoriert Eingabefelder, Slider, Video, Diagramme (`data-no-swipe`), horizontal scrollende Bereiche, vorwiegend vertikale oder langsame Gesten, Starts am Bildschirmrand (System-Zurück-Geste) und gezoomte Seiten. Tasten mit Strg/Alt/Meta/Shift und Tasten in Eingabefeldern oder im Design-Menü werden ignoriert.
- Tests: `tests/navigation.test.mjs` (reine Logik), `test:designs` (Tasten/Wischen/Runner-Sperre je Design). `test:designs` und das Gerüst von `test-exercise-videos.mjs` wurden an `workoutCompletion.js` bzw. die neuen Props angepasst.


## 2026-11-05 — Gemeinsamer Trainingskern und Android-Vorbereitung

- Original und alle drei Designs verwenden denselben Runner in `runner/engine.js`.
  Zeitmessung folgt Uhrzeitankern; lange unbeobachtete Lücken pausieren den Ablauf.
- Haltezeiten können vorzeitig beendet werden. Letzte Satzwerte sind in der Pause
  korrigierbar; Teiltraining und späteres Fortsetzen sind getrennte Aktionen.
- Versionierte Entwürfe behalten Plan, Satzdaten, gemessene Zeit und Trainings-ID.
  Wiederaufnahme erfolgt pausiert; ältere Pausenentwürfe wiederholen keinen Satz.
- Eine feste Trainings-ID verhindert doppelte Abschlüsse bei Wiederholungsversuchen.
  Original-Zusammenfassung und Archiv zeigen Haltesekunden und Wiederholungen getrennt.
- Android: portable JDK-Konfiguration, begrenzte Build-Parallelität, explizites HTTPS,
  Release-Version und Upload-Signierung über Umgebungsvariablen. Release-Gates und
  noch offene native Anmeldung/Kontolöschung: `docs/ANDROID-RELEASE.md`.
- Thenics ist die vom Nutzer benannte funktionale Referenz. Die bisherige
  Primär-/Sekundär-/Conditioning-Reihenfolge bleibt erhalten. Exakte Thenics-
  Satzwerte, Pausen und interne Runner-Abläufe sind damit nicht verifiziert.
- Kein Play-Store-Release und keine reale Geräteabnahme aus diesen Änderungen ableiten.
- Runner-Integrationstest `scripts/test-runner-integration.mjs` (gemeinsamer Kern in allen
  vier Oberflächen, tatsächliche Haltezeit, Doppeltippen, Korrektur, Unterbrechung, Wiederaufnahme,
  Speicherfehler). Service-Worker-Test: Request-Mock um `headers` ergänzt.
- „Skills-Daten löschen": entfernt Cloud-Events und lokale Kopien des angemeldeten Kontos und meldet
  ab; Gast-Daten und der gemeinsame Firebase-Nutzer bleiben. Firestore-Rules erlauben dafür
  Owner-Delete auf `skillsUsers/{uid}/events` (Deploy über VitalOS nötig, Emulator-Test grün).
- Debug-APK `at.vitalos.skills` gebaut (JDK 21); keine Geräteabnahme, native Anmeldung offen.

## 2026-11-05 — Feste Progression, EXP und Stoppuhr-Runner

- Jeder Skill folgt seiner festen Stufenfolge. Eine Stufe wird nur durch 100 % EXP freigeschaltet;
  die nächste bleibt gesperrt. Es gibt kein manuelles Hochsetzen und kein „Stufe zurück“.
  Bereits freigeschaltete Stufen dürfen weiter trainiert werden (EXP zählt nur für die aktuelle).
  Alte manuelle Stufenereignisse gelten als Startpunkt. Regeln: `data/exp.js`, Tests: `tests/exp.test.mjs`.
- EXP: Mindestziel pro Satz = `advancement.minimumValue` (Sekunden bzw. Wiederholungen). Ein Satz am
  Mindestziel gibt den vollen Basisanteil (100 % / (qualifyingSessions × Sätze)), darunter anteilig,
  darüber Bonus bis +50 % des Basisanteils. Mehr Sätze als vorgeschrieben zählen nicht, gleiche
  Einheiten-IDs zählen einmal. Die alten Regeln (Sessions/Tage, Technik-Bestätigung) gelten nicht mehr.
- Runner ohne Countdowns: Start per Tippen, Holds und Pausen zählen hoch, Pause endet nie von selbst.
  Das Ziel ist ein Minimum; alles darüber ist Mehrleistung. Wiederholungen: „Satz fertig“, danach die
  echte Zahl per Slider einstellen (auch beim letzten Satz). Der Slider gilt, bis es weitergeht.
  Einseitige Übungen zeigen den Hinweis „beide Seiten gleich oft, schwächere Seite eintragen“.
- Ein gemeinsames Anzeigemodell (`runner/view.js`) speist React-Karte und die Designs A/B/C.
- Leistungsdatenbank: jede Einheit bleibt als unveränderliches Ereignis (IndexedDB/Firestore) mit
  Sekunden bzw. Wiederholungen je Satz. Lesen: `progressStore.sets({skillId, stageId, since})` bzw.
  `flattenSets()` in `data/model.js`; Fortschritt/EXP über `getSnapshot().progress[skillId]`.
- Aufräumen: Technik-/Unterstützungs-/Zusatzgewicht-Eingaben entfernt (schalten nichts mehr frei), der
  freie Hold-Timer erscheint nur bei Hold-Stufen, Conditioning wiederholt keine Übung der Einheit.
  Im echten Firefox (Marionette) abgenommen: Rep-Durchlauf mit Slider bis EXP-Zusammenfassung und
  Hold-Stoppuhr (Planche); noch keine Abnahme am Android-Gerät.

## 2026-11-12 — Shell-Embed

`embed.jsx` exportiert `SkillsEmbed` für die VitalOS-Shell. Standalone (`main.jsx`)
bleibt beim Dokument-Theme und bei `?skill=` im Hash. Eingebettet liegen Theme und
Hintergrund am Container; Route läuft über `route` / `onRouteChange`. Abschlüsse
tragen `runId` (= `sessionId`). Designs rufen `onWorkoutComplete`, wenn die Shell
ihn übergibt, und senden dann kein zusätzliches `skills:workout-completed`.
Vertrag: `README.md`. Tests: `tests/embed.test.mjs`.

## 2026-11-12 — Ruhiges Classic

Die Karte (`design` leer oder `classic`) ist die leise Standardoberfläche:
neutrale Flächen, ein Akzent, gleiche Abstände, große Tippflächen. Hell und
dunkel folgen `prefers-color-scheme`. In der Shell erbt die Karte das
umgebende Theme, ohne `documentElement` anzufassen. Designs A/B/C bleiben.
