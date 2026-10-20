# Skills App

Standalone-Calisthenics-App und eingebettete Skill-Oberfläche für Fitness.
Die Progressionen, Videozuordnungen und Trainingsläufe werden gemeinsam mit
`SkillsCard.jsx` gepflegt. Die bestehende Fitness-Integration importiert diese
Oberfläche direkt aus dem Skills-Git-Submodule.

## In-App-Update-Changelog

Die App zeigt beim ersten Öffnen einer neuen Release-ID einen Dialog mit den
Commits des Updates. Commit-Titel verlinken direkt auf GitHub; ein weiterer
Link öffnet den vollständigen Commit-Verlauf. „Weiter“ speichert die bestätigte
Release-ID im Browser unter `skills:seen-release`. Derselbe Release-Dialog wird
danach nicht erneut angezeigt.

`scripts/write-release-info.mjs` erzeugt `public/release-info.json` vor dem
lokalen Dev-Server und vor jedem Build. In GitHub Actions nutzt es die Commits
des Push-Events; lokal verwendet es den aktuellen Git-Commit. Die generierte
Datei bleibt ignoriert und wird vom Vite-Build in die App übernommen. Die
Standalone-Hülle in `main.jsx` lädt sie ohne Browser-Cache.

## Daten und Oberfläche

- `SkillsCard.jsx` enthält den gemeinsamen Skills-Bildschirm und Runner.
- `ExerciseVideo.jsx` und `exerciseVideos.json` ordnen die Demos und Tutorials zu.
- `main.jsx` setzt das Skills-Theme und ergänzt den Update-Dialog.
- Fortschritt und aktive Workouts verwenden weiter `fitness-skills-progress-v1`
  und `fitness-skills-active-runner-v1`.
- Die Skill-URL bleibt `?skill=<id>` im Hash.

## Build und Release

- `pnpm run firebase` baut und deployt nach `vos-skills.web.app`.
- `pnpm run deploy` deployt das vorhandene `dist/` ohne Build.
- Fitness verwendet das Git-Submodule `Skills/` auf Branch `fitness`.
- Fitness-Production wird über `fitness-dev` und den Release-Branch
  `fitness-app/vitalos` integriert; der VitalOS-Parent pinnt anschließend den
  konkreten `fitness-app`-Commit.

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
