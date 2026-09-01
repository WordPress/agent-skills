# Code deployment on VIP

Application code is not written by the running app (see `file-system-and-media.md`) — it's deployed via git.

## Default Deployment

- Code lives in the application's `wpcomvip` GitHub repository.
- A branch is mapped to a target environment (e.g. `production`, a non-production environment).
- Any commit pushed to a mapped branch — whether a direct commit or a merged pull request — automatically triggers a deployment to that branch's environment. There's no separate manual "deploy" step once the branch mapping exists.
- GitHub Actions is enabled by default on `wpcomvip` repos and is the place to run build steps: bundling/minifying JS/CSS, `composer install` for PHP dependencies, etc., before the deploy takes effect.
- Branch protection is on by default: branches can't be deleted, and force-pushes are blocked for non-admin users.

## Custom Deployment

- Used when application code is developed in a **different** version control system/repo than the `wpcomvip` GitHub repo.
- Code is pushed to a VIP Platform environment via **VIP-CLI** or an external CI/CD pipeline, rather than relying on the automatic `wpcomvip`-branch-to-environment mapping.
- Appropriate when the org's existing CI/CD (outside GitHub, or a different GitHub org) is the source of truth.

## Debugging "my commit isn't showing up"

1. Confirm which deployment model the app uses (Default vs Custom) — don't assume.
2. **Default Deployment**: confirm the commit landed on the branch that's actually mapped to the target environment, and check GitHub Actions for a failed build step (a failed build can block the deploy from completing even though the push succeeded).
3. **Custom Deployment**: confirm the external CI/CD step that invokes VIP-CLI actually ran and succeeded — the push to the app's own repo doesn't deploy anything by itself in this model.
4. Never suggest editing files directly on the environment as a workaround — the filesystem is read-only outside `/tmp/` (see `file-system-and-media.md`), and even where writes might technically succeed in some path, changes made outside the deploy pipeline will be lost/reverted on the next deploy.

## Source

- https://docs.wpvip.com/code-deployment/
- https://docs.wpvip.com/code-deployment/default-deployment/
- https://docs.wpvip.com/code-deployment/custom-deployment/
- https://docs.wpvip.com/code-deployment/default-deployment/build-and-deploy/github-actions/
