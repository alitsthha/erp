# Clearing Firestore from Settings

Administrators can use **Settings → Database Management → Clear database**.
The dialog shows the Firebase project and environment currently connected to the
app. It requires `DELETE <project-id>` and the administrator's password.

The server verifies administrator access, recent authentication, and its own
project ID before deleting anything. It discovers all root collections and
recursively deletes their documents and subcollections, including descendants of
missing parent documents. This includes settings and stored role assignments.
Firebase Authentication accounts/custom claims, Storage objects, database indexes,
security rules, and the Firebase project itself are not deleted.

Deploy the updated Firestore rules and Functions together before releasing the
frontend. Build the frontend with `npm run build` and Functions with
`npm --prefix functions run build`. The callable is named `clearDatabase`; the
existing callables also include reset guards and must be redeployed. No reset
runs during a build, deployment, or test.

For local development connected to the demo project, explicitly target that project:

```sh
firebase deploy --project demoerp-b1895 --only firestore:rules,functions
```

The CLI builds Functions automatically before deployment. The Firebase project
must have Cloud Functions enabled and meet Firebase's Functions billing requirements.
The callable SDK already handles CORS for localhost. A missing endpoint returns a
404 without CORS headers, which the browser can report as a CORS error and the SDK
as `functions/internal`; changing browser CORS settings does not deploy the function.

During clearing, `_maintenance/databaseReset` blocks client writes through the
Firestore rules and prevents new operations in the app's other callables. Reads
remain subject to their existing permissions. External Admin SDK jobs bypass
rules and should be stopped before resetting. The server checks for remaining
records before reporting success, then removes the marker so the database is empty.

A partial failure retains the marker and pauses writes. Reopen the same dialog
and confirm again to finish. After a timeout or interrupted connection, allow ten
minutes for the old execution to expire before retrying. The initiating account
can retry server-side even if its Firestore role document has already been deleted.
An administrator whose access exists only in `user_roles` may need a project
administrator to restore access after clearing; Authentication custom claims are
unchanged. Use **Reload application** after success to discard loaded records.

The existing Backup & Restore feature exports only its listed sections, not every
collection/subcollection. It is not a complete recovery mechanism for this reset.

Validation: `node --test tests/database-reset.test.mjs` exercises authorization,
project confirmation, recursive deletion, duplicate requests, write blocking,
partial failure, retry, and client confirmation with an isolated Firestore double.
It does not contact Firebase. Emulator rules tests are in
`tests/activity-color-rules.integration.mjs`.
