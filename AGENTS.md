# AGENTS.md — Skills

<!-- release-weg:start -->
## Release-Weg und Branches (Skills)

Stand 2026-10-29. Ausführlich: `~/vitalos/docs/DEPLOYMENT.md` (GitHub: nimmsel23/vitalos, `docs/DEPLOYMENT.md`).

**dev → master → vitalos**

| Branch | Rolle | Lokal |
|---|---|---|
| `dev` | Edits und Previews (Preview-Channel `dev`, PR-Channel je PR) | ja — dieser Klon steht fest auf `dev` |
| `master` | **Standalone-Prod** (Hosting-Target `skills` = vos-skills.web.app); deployt nur per CI (`Live Deploy (Skills master)`) | nein, muss nicht existieren |
| `vitalos` | Stand für die Shell (`~/vitalos/skills-app`); darf hinter `master` liegen | nur als `-app`-Checkout im Meta-Repo |

- Release: `vos-release-pr skills` öffnet den PR `dev → master`. `Check (Skills)` läuft, bei Grün mergt der Auto-Merge
  (Merge-Commit) und startet den Live-Deploy per Dispatch. Nie von Hand auf `master` pushen, außer Hotfix.
- Shell: `vos-release skills` merged `origin/master` nach `vitalos` und bumpt den Pointer im Meta-Repo (deployt die Shell).
  Vorher `vos-overview`.
- Branch-Schutz auf `master` (seit 2026-10-29): Merge nur per PR mit grünem Check `check`; Force-Push und Löschen gesperrt;
  Admin darf für Hotfixes direkt pushen. Kein „Branch muss aktuell sein", sonst blockiert der Auto-Merge.
- `master` wird nie lokal ausgecheckt; `git fetch` genügt. Das Meta-Repo `vitalos` deployt nur noch die Shell.
- Nicht auf `dev` im Hauptordner arbeiten, wenn ein Agent-/Feature-Branch nötig ist: Worktree
  (`git worktree add .worktrees/<name> <branch>`).
- Default-Branch des Repos ist `master`; die `.github/workflows/*.yml` auf `master` bestimmen das Live-Verhalten.
<!-- release-weg:end -->
