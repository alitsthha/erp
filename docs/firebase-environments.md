# Firebase environments

| Command | Firebase configuration | Purpose |
| --- | --- | --- |
| `npm run dev` | `.env.development.local` | Local development against the demo project |
| `npm run build` | `.env.production.local` | Build the production app into `dist` |
| `npm run preview` | Configuration already embedded in `dist` | Inspect the production artifact locally |

The selection is made at build time, not from the browser hostname. A production artifact still uses production when opened through `npm run preview`. Use `npm run dev` for local demo work.

## Configure the two projects

Copy `.env.development.example` to `.env.development.local`, and `.env.production.example` to `.env.production.local`. Fill each with its corresponding Firebase web app configuration. The `*.local` files are ignored by Git. On another machine or in CI, provide the production configuration again before building.

Development requires `VITE_FIREBASE_ENVIRONMENT=demo`; production requires `VITE_FIREBASE_ENVIRONMENT=production`. Missing configuration stops startup/build instead of falling back to another database. The two project IDs must be different.

Configured projects:

- Production: `academy-erp-451f2` in `.env.production.local`.
- Local demo: `demoerp-b1895` in `.env.development.local`.

All Firebase services use the selected project: Firestore, Authentication, Storage, and callable Functions. Secondary authentication used for teacher account creation uses the same configuration. Enable the required services and create an administrator in each project separately. The frontend build does not create a Firebase project, copy data, create Auth users, or deploy rules/functions.

## Backups and demo data

The app already has **Settings → Backup & Restore** for exporting Firestore records to JSON and importing missing document IDs. This is an application-level export, not a full Firebase project backup: it does not include Authentication users, Storage files, Functions, or all project settings/subcollections. Keep any downloaded data outside Git.

The demo Firestore database was created in `asia-south1` and seeded with 689 academy documents on 14 October 2026. The copy was verified against its local backup. Demo Firestore rules and indexes were deployed. The production database was only read.

The complete Firestore snapshot is in `backups/academy-erp-451f2-2026-10-14T15-55-55-542Z.firestore.json`. It preserves native Firestore types and nested subcollections. This REST backup format is separate from the Settings panel's JSON format. The directory is ignored by Git; backup files are readable only by their owner.

For future copies, the script reuses the logged-in Firebase CLI account (install `firebase-tools` globally and run `firebase login`):

```sh
node scripts/firebase-demo.mjs backup
node scripts/firebase-demo.mjs copy backups/<snapshot>.firestore.json
node scripts/firebase-demo.mjs verify backups/<snapshot>.firestore.json
node scripts/firebase-demo.mjs copy-auth
```

`backup` reads production. `copy` writes only missing demo records and rejects conflicts; it never overwrites records. Document references to the source database are remapped to the demo. Production email jobs in `mail` are backed up but excluded from the demo copy.

`copy-auth` creates a private Auth backup, then imports missing accounts with their UIDs, password hashes, and custom claims. It also enables email/password sign-in and authorizes localhost. First initialize Firebase Authentication in the demo project's console if it has not been enabled. All six academy accounts were copied and verified in the demo project on 14 October 2026; email/password sign-in and localhost access are enabled.

Storage objects, deployed Functions, and email extensions are not cloned by these commands. Their clients point to the demo project, so features requiring those services need separate demo deployment.

## Deployment

`.firebaserc` has explicit `production` and `demo` aliases; the default project and hosting site remain production. To deploy only database configuration to the demo:

```sh
firebase deploy --only firestore --project demo
```

Environment files select the frontend's backend; they do not change Firebase CLI deployment targets. Hosting remains configured for the production project.

References: [Vite environment modes](https://vite.dev/guide/env-and-mode), [Firebase multiple-project configuration](https://firebase.google.com/docs/projects/multiprojects).
