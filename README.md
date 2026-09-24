# Skills

Calisthenics-Skills als eigener Feature-Ordner. `src/views/Session/index.jsx` bindet `SkillsCard.jsx` im Skills-Subtab ein; `src/styles.css` lädt `skills.css`. Tailwind scannt diesen Ordner separat.

Fortschritt und unterbrochene Workouts bleiben in den bestehenden localStorage-Keys `fitness-skills-progress-v1` und `fitness-skills-active-runner-v1`. Der Umzug ändert weder diese Daten noch die Skill-URL (`?skill=<id>` im Hash).

Die Skill- und Progressionsliste liegt derzeit noch in `SkillsCard.jsx`; die Calisthenics-YAMLs im Katalog sind eine zweite Quelle. Ein eigenständiges Deployment ist für Skills bislang nicht eingerichtet.
