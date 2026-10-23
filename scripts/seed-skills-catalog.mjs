import { readFile } from 'node:fs/promises';
const catalog = JSON.parse(await readFile(process.env.SKILLS_CATALOG_FILE || new URL('../public/skills-catalog.v1.json',import.meta.url),'utf8'));
const project = process.env.GCLOUD_PROJECT;
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({mode:'dry-run',path:`skillsCatalogs/${catalog.id}`,skills:catalog.skills.length,stages:catalog.skills.reduce((n,s) => n+s.progressions.length,0),version:catalog.version},null,2));
} else {
  if (!project) throw new Error('Set GCLOUD_PROJECT explicitly before --apply');
  const { initializeApp, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  initializeApp({projectId:project,credential:applicationDefault()});
  // Versioned catalogues are immutable. Existing versions must match exactly.
  const doc = getFirestore().doc(`skillsCatalogs/${catalog.id}`);
  await getFirestore().runTransaction(async tx => {
    const previous = await tx.get(doc);
    if (previous.exists) {
      if (JSON.stringify(previous.data()) !== JSON.stringify(catalog)) {
        // Firestore normalizes map key order. Deep comparison handles that.
        const {isDeepStrictEqual} = await import('node:util');
        if (!isDeepStrictEqual(previous.data(),catalog)) throw new Error('Version exists with different content; create a new catalogue version');
      }
    } else tx.create(doc,catalog);
  });
  console.log(`Verified catalog ${catalog.id} in ${project}`);
}
