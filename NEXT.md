- ~~Vite-8 transformWithEsbuild-Landmine~~: Testskripte auf esbuild umgestellt (Vorbeuge vor Major).
- ~~Vite-8 Rolldown `__VITE_PRELOAD__`-Blackscreen~~: `fixRolldownPreloadMarker` vorbeugend (wie 6pack).

# CI-Agent — offener Betriebspunkt

- [ ] Repository-Secrets `SYNC_TOKEN` und `GEMINI_API_KEY` einrichten/prüfen; echten roten Check bis Reparatur, Check, Promote und Deploy beobachten.
- [ ] Gmail-Ausgang mit Run-Diagnose und Gmail-Eingang `[ci:betta]` bis zur Agenten-Routing-Übergabe nachweisen.
# NEXT — skills-dev

## Plan „Skills praktisch einsatzfähig“ (Stand 2026-11-06)
- [x] Gemeinsamer Runner + idempotentes Speichern + Wiederaufnahme (Etappe 1/2)
- [x] Feste Progression, EXP-Freischaltung, Stoppuhr-Runner ohne Countdowns, Slider-Anpassung
- [x] Release: dev → master + Shell-Pin, Rules (Owner-Delete) live, Debug-APK als GitHub-Release `android-latest`
- [x] 2026-11-10: Debug-APK `android-latest` neu gebaut/hochgeladen aus Tip `70c640f` (Task `b559bbe6` done; JDK 21)
- [x] CTO-Nacht `c1f9b6ce` Port: `automerge-pr.yml` Dependabot base=master→dev Retarget (journal-SSOT) — AL 2026-11-12.
- [ ] Geräteabnahme am Android-Handy (Anruf, Bildschirmsperre, Zurück-Geste, Neustart)
- [ ] Native Google-Anmeldung (Capacitor-Plugin + SHA-1/OAuth in Firebase — braucht Konsole)
- [x] Datenschutzerklärung + öffentliche Löschanfrage-Seite: https://vos-skills.web.app/datenschutz, https://vos-skills.web.app/konto-loeschen (#19)
- [ ] Release-Signierung (`SKILLS_UPLOAD_*`), Play-Eintrag
- [ ] Optional: „Letzte Einheit wiederholen“ / Vorlagen (bewusst einfach halten)

- Remote `nimmsel23/skills-dev` + Firebase-Site `vos-skills` anlegen (nur auf Zuruf)
- ~~Submodul in fitness-dev/vitalos, `vos-release skills`~~ erledigt 2026-10-23 (Modul `skills` in `~/vitalos/bin/vos-release`, impliziert `fitness`)
- ~~fitness-dev: `Skills/` durch Import/Alias auf dieses Repo ersetzen~~ erledigt 2026-11-11 (Sibling via `vite-miniapp-submodules.mjs`; kein Gitlink)


## Gemini CI-Agent — verbleibende Betriebsprüfung

- [ ] Einen echten roten, code-behebbaren CI-Lauf beobachten und bestätigen, dass Reparatur-Commit, grüner Check und vorgesehener Promote/Deploy enden.
- [ ] Fehler außerhalb des Codes (fehlende Deploy-Credentials, externe Dienste, Runner-Ausfälle) separat als Diagnose melden; keine ungeprüften Änderungen an Secrets oder Deploy-Konfiguration.
- [ ] GitHub Pages fuer `skills-dev` auf Branch `dev`, Ordner `/docs` prüfen/aktivieren; Pages-Admin-Einstellungen sind über die aktuelle GitHub-Schnittstelle nicht erreichbar.
- [ ] Gemini-Reparaturpfad nach dem Feld-Fix anhand eines isolierten roten Checks verifizieren: Diagnose, Commit, Check-Neustart und nachgelagerter Deploy.
