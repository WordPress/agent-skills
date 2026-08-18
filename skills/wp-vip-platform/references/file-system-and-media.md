# File system and media uploads

## The core rule

Web containers on the VIP Platform run with a **read-only filesystem**. This is a security control: it prevents malicious scripts from being written to disk and executed. The only writable location on the container is `/tmp/`.

Consequences:

- Plugin, theme, and mu-plugin code is deployed via git (see `code-deployment.md`); the running application cannot write new PHP files into `wp-content/`.
- Any code that tries to write config files, cache files, or generated assets to disk at runtime will fail on VIP even if it works on a normal host.
- `/tmp/` is fine for transient work (extracting a ZIP, generating a temporary file before uploading it elsewhere) but is **not shared across containers and not durable** — never treat it as storage for anything that needs to persist or be visible to other requests.

## Media uploads: the VIP File System

Uploaded/imported media is not stored on local disk. It's stored via an API in the **VIP File System**, a separate, read-only-from-the-app object store.

Practical implications:

- It has **no true directory structure** — operations like `rmdir()` on "directories" won't behave as expected.
- Permission calls like `chmod()` / `chown()` don't apply and should not be used against uploaded files.
- Programmatic access/interaction with files stored there is limited to the APIs VIP provides — don't assume arbitrary `fopen`/`fwrite` semantics against upload paths.

## What to check when debugging

- "File write failed" / "permission denied" in production but not locally → the code is writing outside `/tmp/`. Move the write there, or reconsider whether the write is needed at all (deploy the file instead).
- Bulk file/directory manipulation (e.g., recursive delete, chmod on a media directory) → almost certainly needs to go through VIP File System APIs, not raw filesystem calls.
- ZIP extraction, temporary image processing → do it in `/tmp/`, then hand the final artifact to the appropriate upload/media API.

## Source

- https://docs.wpvip.com/technical-references/vip-go-files-system/
- https://docs.wpvip.com/technical-references/vip-go-files-system/media-uploads/
