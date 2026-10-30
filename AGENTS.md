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

### Release-Ablauf für Agents (Stand 2026-10-30, so ohne Rückfragen durchziehen)

Nach „committen/releasen“ vom User gilt die Freigabe für die ganze Kette, nicht nur für den Commit:

1. Tests: `pnpm test` (inkl. `pnpm run test:designs`) und `pnpm run build`. Änderung in `APP.md` vermerken.
2. Commit auf `dev` (Co-Authored-By-Zeile laut Session), `git push origin dev`.
3. `vos-release-pr skills` — öffnet den PR `dev → master`. Der Check `check` läuft, Auto-Merge mergt bei Grün und
   startet den Live-Deploy (`Live Deploy (Skills master)`). Status: `gh pr view <n>`, `gh pr checks <n>`,
   `gh run list --limit 5` (ohne `-R`, sobald das Standard-Repo gesetzt ist, siehe Stolperfalle unten). Nichts von Hand auf `master` pushen.
4. Erst wenn der PR `MERGED` und der Live-Deploy grün ist: `vos-release skills` (Shell-Seite: `origin/master` → `vitalos`,
   Pointer im Meta-Repo bumpen). Vorher optional `vos-release --dry-run skills`.
5. Schritt 4 blockiert der Auto-Mode-Classifier von Claude Code als „Production Deploy“. Dann nicht umgehen, sondern
   den Befehl dem User nennen (`! vos-release skills`) oder dort eine Bash-Permission-Regel für `vos-release skills`
   setzen lassen. Schritte 1–3 gehen ohne Freigabe-Theater.

**Stolperfalle `gh`:** Dieser Klon hat neben `origin` (skills-dev) noch den Alt-Remote `upstream` (→ fitness-dev, vom
Subtree-Split). Ohne gesetztes Standard-Repo hat `gh` deshalb PRs/Runs von **fitness-dev** gezeigt (PR #7 war plötzlich
ein Dependabot-PR). Gelöst mit `gh repo set-default nimmsel23/skills-dev` (steht in `.git/config`, ist pro Klon). Bei
frischem Klon einmal wiederholen; im Zweifel immer `-R nimmsel23/skills-dev` mitgeben. Der Remote `upstream` bleibt
bestehen (Historie des Splits).
<!-- release-weg:end -->
