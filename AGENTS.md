# AGENTS.md — Skills

**Simplicity (Owner 2026-11-11):** So simpel wie möglich. Ausnahme nur `vitalos/prod`. CI-Spine: Check → automerge-pr → automerge → Deploy (CI.md §1).

<!-- release-weg:start -->
## Release-Weg und Branches (Skills)

Stand 2026-11-09. Ausführlich: `~/vitalos/docs/DEPLOYMENT.md`.

**dev → master** (+ Shell-Pin auf `origin/master`)

| Branch | Rolle | Lokal |
|---|---|---|
| `dev` | Edits und Previews (Preview-Channel `dev`, PR-Channel je PR) | ja — dieser Klon steht fest auf `dev` |
| `master` | **Standalone-Prod** (Hosting-Target `skills` = vos-skills.web.app); deployt nur per CI (`Live Deploy (Skills master)`) | nein, lokal nicht nötig |
| `vitalos` | **Legacy** (darf remote noch existieren) — kein Pin-Ziel mehr | nicht für Shell nutzen |

- Release (automatisch): `dev` committen und pushen. Nach grünem Check promotet `automerge.yml` nach `master` und startet den Live-Deploy. Direkte Pushes auf `master` vermeiden; Hotfixes über `dev`.
- Shell: `vos-release` / `vos-ship` pinnt `origin/master` (detached im `*-app`) und bumpt den Meta-Pointer → `deploy-shell.yml`. Vorher `vos-overview`.
- `.gitmodules` im Meta-Repo: `branch = master`. Kein Auto-Vorspulen eines App-Branches `vitalos` mehr.
- Parallel-Branches/Worktrees nur mit Owner-Ausnahme.
- Default-Branch des Repos ist `master`; die Workflows auf `master` bestimmen das Live-Verhalten.
<!-- release-weg:end -->

## Vite 8 / Rolldown

`vite.config.js` enthält `fixRolldownPreloadMarker`. Rolldown hängt sonst an
`__VITE_PRELOAD__` einen Hash; Vite ersetzt nur die Marke und lässt `[]<hash>`
im Bundle (SyntaxError → Blackscreen, wie bei `vos-6pack.web.app`). Plugin nicht
entfernen, sobald Capacitor-Lazy-`import('./web')` im Web-Build landet.


## Org-Taskwarrior (global) — gilt fuer alle Agenten der VitalOS-Org

Verbindlich fuer alle Agenten (Vibe, Claude, Codex, Gemini) in Org-Kontexten
(Owner-Weisung 2026-11-07):

1. EINE globale Org-Task-DB — KEINE eigenen Rollen- oder Repo-DBs mehr:
   `TASKRC=~/.local/state/vitalos-org/taskrc` (DB liegt daneben in `task/`).
   Alte Repo-DBs sind archiviert unter `~/.local/state/vitalos-org/archive-repodb/`.
2. Daniels private Taskwarrior-DB (`~/.task`, u. a. Hotlist `+hot`) bleibt
   TABU fuer Schreibzugriffe — nur lesend (CEO-Runde: Task `status:pending +hot`).
3. Rolle = Tag: Jeder Agent taggt seine eigenen Aufgaben mit seiner Rolle:
   `+ceo`, `+cto`, `+al`, `+pm`, `+alpha`, `+betta` …
4. Abteilung/Repo = project: `project:fitness-dev`, `project:journal-dev`,
   `project:vitalos-prod`, `project:dotfiles`, `project:aos` …
5. Prio-Encoder (in der Org-taskrc verankert):
   - `+hit` und `+br` sind EIN Tier (Hits = Big Rocks, Koeffizient 8.0) —
     hoechste Dringlichkeit, `+hit` = `+br`.
   - `+lr` 2.0 (Little Rocks).
   - `+hot` 1.0 — NUR Potential/Sichtbarkeit, wird NIE automatisch ausgefuehrt;
     ob ein Potential jetzt anfaellt, entscheidet der Door War (Sonntagsrunde).
   - `+s` -1.0 (Sand, Zeitverschwendungsroutine).
   - `+go` ist KEINE Prioritaet und bewirkt nichts — Freigaben laufen ueber
     die Rollen (CTO-Freigabeprozess), nicht ueber Urgency.
6. Aufgaben IMMER per UUID anfassen (`task <uuid> modify|done|info`), NIE per
   ID — IDs renummerieren sich nach jedem `done` (Fehltreffer-Gefahr).
7. Guard: orgsh und die Runner verweigern den Lauf, wenn die Org-taskrc fehlt —
   kein stiller Rueckfall auf die Privat-DB.
8. Uebersicht/Rang: `TASKRC=~/.local/state/vitalos-org/taskrc \
   ~/.org/venv/bin/python ~/aos/bin/aos door plan quadrants --json`
   (Eisenhower-Sicht Q1–Q4).

## Gemeinsame Produktquelle (2026-11-26)

CoreSkills.jsx ist ein Kompatibilitaetseinstieg zur gemeinsamen Quelle in 6pack-dev/CoreSkills.jsx. Neue Skills-Produktfunktionen dort unter skills/ pflegen. Dieses Repo und seine Hosting-/Native-Einstiege erst nach Umstellung aller Hosts entfernen. Details: ../6pack-dev/skills/MIGRATION.md.
