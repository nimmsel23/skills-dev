# Release-Weg (seit 2026-10-29)

- `dev`: Edits und Previews (Preview-Channel `dev`, PR-Channel je PR).
- `master`: Standalone-Prod `vos-skills.web.app`, deployt nur per CI (`Live Deploy (Skills master)`).
- Release: `vos-release-pr skills` öffnet den PR `dev -> master`. `Check (Skills)` läuft auf dem PR; bei Grün
  mergt `automerge.yml` (Merge-Commit) und startet den Deploy per `workflow_dispatch`.
- `vitalos` (Branch): Stand für die Shell, darf hinter `master` liegen; Pointer zieht `vos-release`.
