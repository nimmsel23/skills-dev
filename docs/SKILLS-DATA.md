# Skills: Katalog, Progression und Speicherung

Stand: 2026-10-23. Eigenständige Skills-Domain im Firebase-Projekt `fitness-aos`.
Kein Import aus Fitness/6Pack, keine Trainingsdaten unter deren Collections.
Auth und Firebase-Projekt dürfen geteilt sein; Katalog, Ereignisse, Speicher und
Aufstiegsregeln gehören Skills. In einer eingebetteten App wird die vorhandene
Firebase-Instanz genutzt; standalone gibt es Google-Anmeldung.

## Katalog v1

Quelle: `public/skills-catalog.v1.json`. 14 Skills, 65 Stufen, fünf Kategorien:
Drücken, Ziehen, Rumpf, Beine und Balance. Keine Free-/Pro-Zuordnung.

Jeder Skill hat eine feste ID, Zielbeschreibung und Equipment. Jede Stufe hat:

- eine permanente, vom Array-Index unabhängige ID wie `front-lever/tuck-front-lever`;
- Messgröße `reps` oder `seconds`, Satzanzahl, Zielwert und Pause;
- explizite Voraussetzung, Technikmerkmale und Seitenregel;
- Regeln für Unterstützung, Zusatzgewicht und Bestätigung des Aufstiegs.

Die Namen/Medien und ausdrücklich vorhandenen Front-Lever-Vorgaben bleiben
anschlussfähig. Die neuen Zielwerte sind als eigene App-Startwerte gekennzeichnet,
nicht als wissenschaftlich validierter oder fremder Trainingsplan. Die lineare
Kette beschreibt eine Lernroute; Voraussetzungen werden angezeigt und bleiben
manuell übersteuerbar. Es gibt keine erzwungene Trainingsfreigabe.

Ein Aufstieg wird empfohlen, wenn die Primärübung an mindestens zwei verschiedenen
lokalen Trainingstagen alle geforderten Sätze sauber erfüllt hat. Technik muss
explizit bestätigt sein; bei einseitigen Skills zusätzlich beide Seiten. Die
schwächere Seite wird geloggt. Unterstützung und Zusatzgewicht werden erfasst.
Hold-Stoppuhr-Versuche sind Messungen in Millisekunden, keine vollständigen
Satznachweise. Runner-Holds werden in Sekunden protokolliert. Der Countdown allein
beweist keine saubere Ausführung.

Ein erfülltes Kriterium schaltet nichts automatisch frei. Der Nutzer bestätigt
den Stufenwechsel. Manuelle Übersteuerung ist möglich und wird gekennzeichnet.
Die letzte Stufe ist zunächst **in Arbeit**; Meisterschaft erfordert eine eigene
Bestätigung. Rückstufung behält alle Versuche und Trainings bei.

Version 1 ist unveränderlich. Änderungen der Reihenfolge/Bedeutung brauchen eine
neue Katalogversion und explizite Migration. IDs dürfen nicht wiederverwendet
werden. Alte Trainings behalten ihre damaligen Namen, Zielwerte und Stufen-IDs.

## Vier Speicherschichten

| Schicht | Inhalt | Aufgabe |
|---|---|---|
| Service Worker / Cache Storage | HTML, alle gebauten JS/CSS-Dateien, versionierter JSON-Katalog | Offline-Start nach erfolgreicher Erstinstallation |
| IndexedDB `skills-progression-v1` | `catalog`, `events`, `runner` | Dauerhafter lokaler Datenbestand und ausstehende Cloud-Übertragungen |
| localStorage `skills:v1:*` | Katalog, Ereignisspiegel pro Konto, aktiver Runner | Wiederherstellung; Spiegel ersetzt keine Cloud-Bestätigung |
| Firestore | `skillsUsers/{uid}/events/{eventId}`, `skillsCatalogs/calisthenics-v1` | Nutzerbezogener Geräte-Sync und administrativ veröffentlichter Katalog |

IndexedDB-Version 1 ist zwischen Seite und Worker identisch. `events` enthält
`{key: owner+':'+event.id, owner, event, synced}`; `runner` enthält `{owner,state}`;
`catalog` verwendet `id` als Schlüssel. Ein IndexedDB-Commit wird abgewartet,
bevor ein Training als gespeichert gilt. Schreibfehler sind sichtbar und die
Zusammenfassung bleibt offen. localStorage-Ausfälle werden separat angezeigt.
Bei Verlust der IndexedDB lassen sich gespiegelte Ereignisse wieder einlesen.
Browser-Löschung beider lokalen Speicher entfernt noch nicht synchronisierte Daten.

Der Runner ist geräte- und kontolokal, einschließlich bereits erfasster Sätze,
Startzeit, RPE, Stufe und Abschlussphase. Countdown-Zwischenstände sind nicht
fortlaufend gespeichert; der aktuelle Satz startet nach Wiederaufnahme mit der
Vorbereitung neu. Erfolgreicher Abschluss löscht den Runner erst nach Speicherung.
Videos sind weiter externe Medien und nicht Teil der Offline-Garantie.

## Ereignisvertrag

```json
{
  "id": "unique-event-id",
  "schemaVersion": 1,
  "catalogVersion": 1,
  "type": "hold",
  "skillId": "front-lever",
  "stageId": "front-lever/tuck-front-lever",
  "at": "2026-10-23T12:00:00.000Z",
  "payload": { "duration": 15200 }
}
```

Typen: `hold`, `session`, `stage`, `legacy`. Sessions enthalten einzelne Übungen
und tatsächlich erfasste Sätze sowie Technik-/Seitenbestätigung, Unterstützung,
Zusatzgewicht, RPE und lokalen Trainingstag. Stufenereignisse enthalten `mastered`,
`manual` und gegebenenfalls `reset`. Der Fortschritt wird aus allen Ereignissen
reproduzierbar projiziert. IDs deduplizieren wiederholte Übertragungen.

Geräte führen Versuch/Training durch Vereinigung zusammen, nicht durch Ersetzen
eines ganzen Fortschrittsdokuments. Gleichzeitige widersprüchliche Stufenwechsel
werden nach Client-Zeit und dann ID aufgelöst; alle Ereignisse bleiben erhalten.
Die Geräteuhren müssen für die fachlich korrekte Reihenfolge stimmen. Es gibt
keinen serverseitigen Leistungsnachweis. Die App prüft IDs und Messwerte; die
Rules prüfen Besitzer, Grundschema, Typ und Unveränderlichkeit.

## Automatischer Sync

Ohne Login werden Daten ausschließlich in localStorage und IndexedDB auf diesem
Gerät gespeichert. Es gibt keinen anonymen Firebase-Login und keinen Cloud-Sync.
`guest` ist lediglich der interne Schlüssel des lokalen Speicherbereichs, kein
Gastkonto oder eigener Zugang.
Ein vorhandener Firebase-Login bestimmt die UID, niemals eine eingegebene UID.
Nach Anmeldung erscheint der Datenbestand dieses Kontos. Lokale Daten können mit
einem ausdrücklich beschrifteten Button übernommen werden; erneute Übernahme
ist idempotent. Automatisches Zuordnen privater lokaler Daten zum nächsten Login
findet nicht statt. Abmelden wechselt zum separaten lokalen Datenbestand.

Lokale Ereignisse werden bei Anmeldung, neuem Eintrag, erneuter Verbindung und
App-Start automatisch übertragen. Firestore hat zusätzlich seine persistente
Offline-Queue. `synced` wird erst nach Serverbestätigung gesetzt. Server-Listener
übernehmen Ereignisse anderer Geräte. Cache-Snapshots sind keine Serverbestätigung.
Ein Fehler wie `permission-denied` bleibt sichtbar; „Speicher / Sync erneut
versuchen“ stellt auch den Listener neu her.

Der Worker hält Katalog und App offline bereit und kann bei Background Sync
geöffnete Clients zum Flush auffordern. Er speichert keine Auth-Tokens und
überträgt keine Firestore-Requests über eine zweite Fetch-Queue. Ein vollständig
geschlossener Browser garantiert keinen Sync. Dann erfolgt der Upload beim
nächsten Öffnen. Firestore und Auth umgehen den HTTP-Cache des Workers.
Firebase beschreibt die SDK-Offline-Synchronisation hier:
https://firebase.google.com/docs/firestore/manage-data/enable-offline

## Bestehende Daten

Die alten Keys `fitness-skills-progress-v1` und
`fitness-skills-active-runner-v1` werden einmalig nach `guest` migriert.
Ein fester Ereignisschlüssel pro Skill macht wiederholte Migration idempotent.
Alle bisherigen Holds, Sessions und Historieneinträge bleiben erhalten. Aus
„letzter Array-Index“ wird keine nachträgliche Meisterschaft abgeleitet.
Alte Keys bleiben unverändert als Sicherung bestehen. Nicht zuordenbare Skills
werden nicht importiert und bleiben dort zur manuellen Prüfung erhalten.

## Firebase bereitstellen

`firebase.json` bleibt das Hosting-Setup. Der Emulator nutzt absichtlich eine
eigene Konfiguration; ein Hosting-Deploy veröffentlicht keine Firestore-Regeln.

1. Die zwei `match`-Blöcke aus `firestore/skills.rules` in den tatsächlichen
   gemeinsamen Rules-Owner des Projekts integrieren. Aktuell liegt der lokale
   Rules-Owner unter `~/fitness-dev/firestore.rules`. Die ganze Datei dort durch
   die Skills-Datei zu ersetzen würde andere Domains sperren. Vor Release die
   vereinigten Regeln im Emulator prüfen und über den zuständigen Releaseweg
   veröffentlichen.
2. `pnpm run catalog:seed` zeigt den geplanten Katalog ohne Schreibzugriff.
   Veröffentlichung mit explizitem Projekt und vorhandenen Admin-ADC:
   `GCLOUD_PROJECT=fitness-aos pnpm run catalog:seed -- --apply`.
   Das Skript legt nur eine unveränderliche Katalogversion an und verifiziert
   identische bestehende Daten. Der offline gebündelte Katalog ist dieselbe Datei;
   die App hängt zum Start nicht von einem Katalog-Download ab.
3. Hosting/App und gegebenenfalls den Host-Service-Worker über den regulären
   Releaseweg veröffentlichen. Bei Einbettung muss der Host die Skills-Bundles
   mit precachen; der Standalone-Worker kontrolliert ausschließlich seinen Scope.
4. Mit zwei echten Geräten anmelden, offline trainieren, App neu starten und
   später Serverbestätigung sowie Empfang auf dem zweiten Gerät abnehmen.

Keine Composite-Indizes erforderlich: Der Listener liest die Ereignis-Collection
eines Nutzers. Pro Ereignis ein Dokument vermeidet das 1-MiB-Limit eines wachsenden
Fortschrittsdokuments. Der aktuelle Listener liest die gesamte Historie; bei sehr
großen Beständen sind später versionierte Snapshots/Paginierung erforderlich.

## Prüfen

- `pnpm test`: Katalog, Projektion, IDB/localStorage, Migration, Controller-Sync,
  Kontowechsel, Replay und vorhandene Medien-/Runner-Checks.
- `pnpm run test:rules`: isolierter Firestore-Emulator mit `demo-skills`.
- `pnpm run build && pnpm run test:sw`: gebauter Worker inklusive Offline-Katalog,
  IDB-Initialisierung und precachten Bundles.

Stand dieses Worktrees: implementiert und lokal geprüft. Keine Produktionsregeln,
kein Cloud-Katalog und kein Hosting-Release wurden veröffentlicht. Die produktive
Cloud-Anbindung benötigt die oben beschriebene Rules-Integration.


## Designvarianten

A/B/C und Original verwenden dieselbe Projektion und dieselben Ereignisse.
`data/designProgress.js` bindet Vanilla-Renderer an den Datenspeicher;
`PersistenceStatus.jsx` stellt gemeinsame Login-/Speichersteuerung bereit.
Alle fünf Kategorien sind sichtbar. Die Varianten speichern Runner-Zustände im
selben kontolokalen Format und bestätigen Meisterschaft ausdrücklich.
`pnpm run test:designs` prüft die wirklichen Designmodule im DOM mit dem gemeinsamen
Modell: alle Skills, Stufenwechsel, Meisterschaft, Rückstufung, Speicherfehler,
Technikbestätigung und gespeicherte Sessions. Das ersetzt keine visuelle
Abnahme auf einem echten Mobilgerät.
