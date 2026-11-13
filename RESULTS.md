# 2026-11-13 — AL: CI-Betriebspunkte geprüft (Pages + Secrets)

- GitHub Pages aktiv über Actions (`dashboard.yml`, `d900abc1`); Deploy `eef76a0e` (Run `43335162374`) → https://nimmsel23.github.io/skills-dev/. NEXT-Punkt „Branch dev /docs“ damit überholt.
- Secrets `SYNC_TOKEN` + `GEMINI_API_KEY` vorhanden. Offen bleibt nur die Beobachtung eines echten roten Checks (Gemini-Reparaturpfad).
- dev = master (`eef76a0e`, 0/0); PR-AutoMerge schedule `43347748590` success ohne Dependabot-PR.

# 2026-11-12 — AL: automerge-pr Dependabot Retarget (Org c1f9b6ce Port)

- journal-SSOT: vor Squash Dependabot-PRs mit `base=master` auf `base=dev` retargeten (nur `dependabot/*`).
- Feature-Freeze-Wartung/CI; Fremd-WIP Checkout unberührt (Temp-Worktree).

## 2026-11-12 — CI: Gemini + Merge-Agent wiederhergestellt

- Restored: gemini-ci-repair.yml (Owner: volle Automatisierung)
- Simplicity ≠ bestehende Auto-Schienen killen.

## 2026-11-11 — CI Simplicity: remove Gemini/Merge-Agent

- Removed: gemini-ci-repair.yml
- Spine: Check → automerge-pr → automerge → Deploy. Exception only vitalos/prod.

## 2026-11-11 — Offline-/SW-Re-Verifikation (AL Lauf 2)

- Testsuite (package.json `test`, node-Direktaufruf im Temp-Worktree) grün: Katalog/IDB/Store-Sync/Runner/Videos/Designs.
- `vite build` + `test:sw` grün: Worker precacht Bundles+Katalog, seedet IndexedDB, liefert Katalog offline (`vos-skills-vmwcagf9c`).
- Live bereits auf Tip `c966a90` (Deploy `42954958915`). Zweigeräte-/Login-Abnahme bleibt Owner-Gate.

## 2026-11-11 — Fitness-Skills-Merge Doku (AL)

- Befund: `fitness-dev` ohne `Skills/`/`.gitmodules`; Resolver `vite-miniapp-submodules.mjs` → Sibling `skills-app`/`skills-dev`. VitalOS-Pin `skills-app` = Tip `24d5d0b` (`master`). `origin/fitness` fehlt; lokaler `fitness` 98 behind / 0 ahead.
- Doku angeglichen: `CLAUDE.md` / `APP.md` / `README.md`; TODO/NEXT abgehakt.

- 2026-11-10: fix(build): `fixRolldownPreloadMarker` in `vite.config.js` (Vite 8 / Rolldown `__VITE_PRELOAD__<hash>` → Blackscreen-Vorbeuge, analog 6pack). Live aktuell ohne Cap-Lazy-Imports noch nicht betroffen; AGENTS.md dokumentiert.
- 2026-11-10: chore(deps) major stack align — React 19 / Vite 8.3.6 / plugin-react 6.2.1 / Firebase 13 (age-safe pins, pnpm-workspace overrides).

## 2026-11-10 — `build:android` JDK-21-Pin (AL Lauf 2)

- `scripts/build-android.sh` + `package.json` `build:android`: setzt `JAVA_HOME` auf `$HOME/.local/share/jvm/jdk-21` wenn vorhanden (System 17/27 fail an AGP 8). Override `JAVA_HOME_OVERRIDE`.
- `docs/ANDROID-RELEASE.md` angeglichen. Demo-Loops (TODO): Caliverse ohne Exact-Match / Fuzzy verboten → weiter offen.

## 2026-11-10 — APK `android-latest` hinter Tip (AL)

- Rebuild Debug-APK aus Tip `70c640f` (Worktree `/dev/shm/wt-abt-skills-dev`, `JAVA_HOME=~/.local/share/jvm/jdk-21.0.13+9`; System-JDK 17/27 scheitern).
- `gh release upload android-latest --clobber`: `skills-app-debug.apk` 4 643 043 B, sha256 `0144c5af30aa72d15491ae083947272dfa3611502912d7322e0515e045b7bdcb`, updated 2026-11-10T03:44:51Z.
- Tip=`origin/dev`=`origin/master`=`70c640f`; Live Deploy `42750865084` success; Org-Task `b559bbe6` done.


## 2026-11-09 — deps: minor/patch Upgrades

- ncu minor + age-safe vite/rolldown pins.

## 2026-11-09 — APK `android-latest` Abweichung (AL)

- `gh release view android-latest`: Asset `skills-app-debug.apk` (5.1 MB, updated 2026-11-06T03:10:46Z) gebaut aus `1700952` („Qualitätsfelder entfernt…“).
- `origin/dev` = `origin/master` = `c475d86` — Abstand `1700952..c475d86` = 32 Commits. Live Deploy zuletzt grün (`42625371656`).
- Kein Rebuild/Upload im AL-Lauf (Owner-Gate, kein Store). Folge-Task `b559bbe6-859e-4ad8-9685-45f60b757790` (+al/+lr).

## 2026-11-09 — Shell-Pin auf origin/master (CI/AGENTS)

CI/AGENTS: kein vitalos-Vorspulen; Merge-Agent nur master; Release-Weg = dev→master + Shell-Pin.