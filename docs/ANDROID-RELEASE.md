# Skills Android: Build, Abnahme und Play-Release

Stand: 2026-11-05. Ziel ist die eigenständige Android-App `at.vitalos.skills`.
Die Android-App enthält das gebaute Web-Frontend über Capacitor. Sie ist kein
TWA-Link zur Firebase-Website. Der Web-Release `dev → master (+ Shell-Pin)` bleibt
ein eigener Weg; ein erfolgreicher Hosting-Deploy veröffentlicht keine Android-App.

## Verifizierter Ausgangspunkt

| Bereich | Befund |
|---|---|
| Paketname | `at.vitalos.skills`, konsistent in Capacitor, Gradle und MainActivity |
| Android | minSdk 24, compileSdk und targetSdk 36 |
| Build-Werkzeuge | AGP 8.13.0, Gradle 8.14.3, Java-Quellniveau 21 |
| Rechner Alpha | SDK-Plattform 36 und Build Tools 36.0.0 vorhanden; Gradle 8.14.3 gecacht |
| Java | Systemstandard Java 27; verwendbares JDK 21 unter `~/.local/share/jvm/jdk-21` |
| Verbindung | Gebündelte Assets über HTTPS-Localhost; Cleartext und Mixed Content ausgeschaltet |
| Signierung | Upload-Key über Umgebungsvariablen; keine Schlüssel erzeugt oder gelesen |
| Release-Version | `SKILLS_VERSION_CODE` und `SKILLS_VERSION_NAME`; Standard 1 / 1.0 |
| Veröffentlichung | Play-Console-Konto, App-Eintrag, Signing-Registrierung und Produktionszugang nicht verifiziert |

Diese Tabelle ist kein Nachweis für einen fertigen Store-Release oder für einen
funktionierenden nativen Login. Die folgenden offenen Abnahmen sind verbindlich.

## Reproduzierbarer Build

Im Repo mit installiertem, zum Lockfile passendem Node-/pnpm-Setup:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
pnpm test
pnpm run test:designs
pnpm run build:android
```

`pnpm run build:android` setzt `JAVA_HOME` auf `$HOME/.local/share/jvm/jdk-21`,
wenn dieser Symlink ausführbares `bin/java` hat (`scripts/build-android.sh`).
Override: `JAVA_HOME_OVERRIDE=/pfad/zu/jdk-21`. CI verwendet seine eigenen Pfade.
`android/gradle.properties` enthält bewusst keinen absoluten Benutzerpfad.
Native Builds nacheinander ausführen. `native:sync` erzeugt die Capacitor-Projekte
und kopiert das aktuelle `dist/`; nach Web-Änderungen kein altes Asset-Bundle verwenden.

Falls der pnpm-Package-Manager-Store im Sandbox-Kontext schreibgeschützt ist,
ist das ein Toolchain-Fehler. Mit bereits installierten Abhängigkeiten können
die lokalen Werkzeuge direkt aufgerufen werden:

```bash
node node_modules/vite/bin/vite.js build --mode native
node node_modules/@capacitor/cli/bin/capacitor sync android
```

Das ersetzt weder Lockfile-Installation auf CI noch die Tests. Das Debug-APK liegt
unter `android/app/build/outputs/apk/debug/app-debug.apk`.

Für einen Release müssen alle vier Variablen aus einem Secret-Store bzw. einer
transienten Terminal-Umgebung gesetzt sein. Werte nicht in Chat, Logs oder Git ablegen:

| Variable | Bedeutung |
|---|---|
| `SKILLS_UPLOAD_STORE_FILE` | Absoluter Pfad zum bestehenden Upload-Keystore außerhalb des Repos |
| `SKILLS_UPLOAD_STORE_PASSWORD` | Keystore-Passwort |
| `SKILLS_UPLOAD_KEY_ALIAS` | Alias des Upload-Schlüssels |
| `SKILLS_UPLOAD_KEY_PASSWORD` | Schlüsselpasswort |

`SKILLS_VERSION_CODE` muss positiv, höchstens 2100000000 und größer als bereits
veröffentlichte Codes sein. `SKILLS_VERSION_NAME` ist die sichtbare Versionsnummer.
Der erste Standardwert 1 ist keine Aussage darüber, welche Codes Play schon kennt.

Nach aktuellem Web-Build und Capacitor-Sync:

```bash
cd android
./gradlew --no-daemon --max-workers=1 bundleRelease
```

Ohne vollständige Signierung bricht der Release bewusst ab. Das AAB entsteht unter
`android/app/build/outputs/bundle/release/app-release.aab`. Vor Upload Paketname,
Version, Release-Manifest, Zertifikat und enthaltene Assets prüfen. Upload-Key und
Play-App-Signing-Key sind verschiedene Rollen; native Google-Anmeldung muss auch
mit dem Zertifikat der von Play ausgelieferten App funktionieren.
[Android: App-Signierung](https://developer.android.com/studio/publish/app-signing)

## Produktlücken vor dem ersten öffentlichen Release

- **Native Anmeldung:** Beim Audit verwendete `data/cloud.js` ausschließlich
  Firebase `signInWithPopup`. Ein Web-Popup ist kein verifizierter Android-Login.
  Einen unterstützten nativen oder Systembrowser-Flow integrieren, anschließend
  Firebase-Credential übernehmen und Login/Logout/Abbruch/Kontowechsel am Gerät
  prüfen. Keine Google-OAuth-Seite in die eingebettete WebView zwingen.
  [Google: OAuth in nativen Apps](https://developers.googleblog.com/modernizing-oauth-interactions-in-native-apps-for-better-usability-and-security/)
- **Kontolöschung (teilweise, 2026-11-05):** In-App-Button „Skills-Daten löschen"
  löscht Cloud-Events (`skillsUsers/{uid}/events`, Rules erlauben jetzt Owner-Delete)
  und lokale Kopien des Kontos und meldet ab; Gast-Daten bleiben. Der gemeinsame
  Firebase-Nutzer wird bewusst nicht gelöscht. Öffentliche Anfrageseite
  https://vos-skills.web.app/konto-loeschen (2026-11-11, #19): Gesamtkonto-Löschung per
  E-Mail an den Betreiber, Frist ein Monat (Art. 12 Abs. 3 DSGVO), manuell bearbeitet.
  Ursprünglicher Audit-Befund: In-App-Weg und öffentliche Anfrageseite fehlen.
  Skills-Daten, lokale Kopien und ausstehende Uploads müssen berücksichtigt werden.
  Firebase Auth wird mit anderen VitalOS-Modulen geteilt: den gemeinsamen Nutzer
  nicht beiläufig beim Löschen nur der Skills-Daten löschen. Umfang verständlich
  festlegen und eine vollständige Konto-Löschanforderung tatsächlich bearbeiten.
- **Datenschutz (erledigt 2026-11-11, #19):** https://vos-skills.web.app/datenschutz,
  in der App unter Anmeldung/Sync verlinkt; `tests/legal-pages.test.mjs` hält Seiten,
  Rules und Datenvertrag zusammen. Ursprüngliche Vorgabe:
  Tatsächliche Datenflüsse erfassen: optional Google/Firebase, Trainingsdaten,
  Medien-CDNs, YouTube und externe Fonts; App-Name/Betreiber/Kontakt sowie
  Aufbewahrung/Löschung aus realen Betreiberangaben übernehmen.
- **Android-Lifecycle:** Zurück-Geste, App-Wechsel, Prozessneustart, Display-Sperre,
  Audio-Unterbrechung, Safe Areas und Tastatur am Gerät abnehmen. Installiertes
  `@capacitor/app` allein beweist keine Lifecycle-Anbindung. Web-Build: Vite-8-
  Plugin `fixRolldownPreloadMarker` in `vite.config.js` behalten (sonst
  `__VITE_PRELOAD__<hash>` → SyntaxError/Blackscreen, siehe 6pack).

- **Medien:** Verfügbarkeit und Nutzungsrechte für die kommerzielle App prüfen.
  Öffentlich erreichbare Demo-Videos sind kein Beleg für kommerzielle Lizenz.
  Offline-Training braucht auch ohne Video verständliche Technikhinweise.
- **Markenauftritt:** Native Launcher-/Splash-Ressourcen auf tatsächliches Skills-
  Branding prüfen. Web-Icons ersetzen Android-Ressourcen nicht automatisch.
- **Android-Backup:** Manifest erlaubt derzeit OS-Backup. Wiederherstellung der
  WebView-/Kontodaten prüfen und deklarierte Datenhaltung damit abstimmen.

## Play-Vorgaben und Nachweise

Aktuelle offizielle Quellen am 2026-11-05 geprüft. Vor Einreichung erneut prüfen.

| Anforderung | Für Skills / benötigter Nachweis |
|---|---|
| Target API | Neue Smartphone-Apps und Updates benötigen seit 31.08.2026 mindestens API 36; Quellkonfiguration erfüllt dies, finalen AAB-Inhalt prüfen |
| Android App Bundle | Neue Apps als signiertes AAB einreichen und Play App Signing konfigurieren |
| 16-KB-Seiten | Finale Abhängigkeiten/AAB auf native `.so`-Bibliotheken und deren Kompatibilität prüfen; bei reinem Java/Kotlin-Code trotzdem Gerätetest durchführen |
| Data Safety | Dateninventar einschließlich SDKs und externer Medien erstellen, mit Datenschutzerklärung abgleichen und Formular ausfüllen |
| Health-Declaration | Skills zeichnet Workouts auf; daraus folgt die Einordnung „Activity and Fitness“; Formular vollständig nach tatsächlichen Funktionen ausfüllen |
| Kontolöschung | Wenn Kontoerstellung angeboten wird: In-App-Anforderung und öffentlicher Web-Weg, anschließend tatsächliche Löschung zugehöriger Daten |
| Store-Eintrag | Name, Kurz-/Langbeschreibung, Icon, Feature-Grafik, echte Screenshots, Supportkontakt, Länder und Preismodell |
| App Content | Zielgruppe, Altersfreigabe, Werbung, App-Zugriff für Reviewer und gegebenenfalls weitere Console-Erklärungen |
| Testpflicht | Bei persönlichen Konten nach 13.11.2023: mindestens 12 Tester durchgehend 14 Tage im geschlossenen Test, danach Produktionszugang beantragen; Kontotyp/-datum unbekannt |

Quellen: [Target API](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en),
[App Bundles](https://developer.android.com/guide/app-bundle),
[16-KB-Kompatibilität](https://developer.android.com/guide/practices/page-sizes),
[User Data / Datenschutz](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en),
[Health-Declaration](https://support.google.com/googleplay/android-developer/answer/14738291?hl=en),
[Kontolöschung](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en),
[Testpflicht persönlicher Konten](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).

## Abnahmefolge

1. Gemeinsamen Runner und Speicherung testen; Web-Build und Native-Sync erzeugen.
2. Debug-App installieren: Erststart offline, vollständiges Training, früher Hold-
   Stopp, Wiederaufnahme, Neuladen/Prozessverlust, Teilabschluss und Korrektur prüfen.
3. Native Anmeldung, Kontotrennung und späteren Cloud-Sync auf zwei Geräten prüfen.
4. Datenschutzerklärung, Löschverfahren und Medienrechte abschließen.
5. Signiertes AAB erzeugen, Zertifikat/Version/Manifest/Assets prüfen.
6. Im internen Play-Test installieren; den tatsächlich von Play signierten Build
   einschließlich Login testen und Pre-launch report bearbeiten.
7. Falls für das Konto erforderlich: geschlossenen Test absolvieren und Freigabe
   für Produktion erhalten. Testerfeedback und behobene Fehler dokumentieren.
8. Finalen Store-Eintrag und alle Erklärungen prüfen, Produktion einreichen.
9. Erst nach Freigabe und erreichbarem Listing/Installation als veröffentlicht
   bezeichnen. Ein AAB, ein Upload oder ein grüner Build allein reicht nicht.

Offene Betreiberentscheidungen: Play-Konto/-Zugang, Betreiber-/Supportangaben,
Datenschutz-/Lösch-URL, Länder/Zielgruppe/Preismodell, Upload-Key-Verwaltung und
gegebenenfalls Testgruppe. Keine davon wurde durch diesen Audit stillschweigend gesetzt.
