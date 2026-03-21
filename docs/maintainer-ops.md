# Maintainer Ops

Operational runbook for maintaining `dknauss/agent-skills`.

## Current Baseline

- Default branch: `trunk`
- Upstream remote: `WordPress/agent-skills`
- Required CI check for branch protection: `validate`
- Public release line: semantic version tags such as `v0.1.1`

## Routine Maintenance

### 1. Validate local changes

Run these before pushing:

```bash
node eval/harness/run.mjs
bash eval/harness/run-scenarios.sh eval/scenarios/
node shared/scripts/skillpack-build.mjs --clean --out=dist --targets=codex,vscode,claude,cursor
node shared/scripts/skillpack-install.mjs --from=dist --dest=/tmp/agent-skills-review-smoke --targets=codex,vscode,claude,cursor
```

### Optional local auto-sync

To keep user-level Codex, Claude Code, and Cursor skills synced after local repo updates:

```bash
node shared/scripts/install-auto-sync-hooks.mjs
```

Those updates are consumed on the next new Codex, Claude Code, or Cursor session. Existing sessions do not hot-reload skill content.

To mirror Copilot / VS Code skills into specific repos at the same time:

```bash
node shared/scripts/install-auto-sync-hooks.mjs --vscode-repos=/abs/path/repo-one,/abs/path/repo-two
```

### 2. Keep scenarios and references aligned

- Update `eval/scenarios/` when skill behavior or quality bars change.
- Update `references/` when upstream docs or canonical sources change.
- Do both when the procedure changes because the source guidance changed.

### 3. Review GitHub settings occasionally

Expected public settings:

- Issues: enabled
- Wiki: disabled
- Projects: disabled
- Private vulnerability reporting: enabled
- Dependabot security updates: enabled
- Homepage: `https://github.com/dknauss/agent-skills/releases/latest`

## Releasing

### 1. Update changelog

Move meaningful items from `Unreleased` into a versioned entry in `CHANGELOG.md`.

### 2. Tag from `trunk`

```bash
git checkout trunk
git pull --ff-only origin trunk
git tag -a v0.1.2 -m "v0.1.2"
git push origin trunk
git push origin v0.1.2
```

### 3. Verify the release workflow

The workflow at `.github/workflows/release.yml` should publish the GitHub release automatically when a `v*` tag is pushed.

Check:

```bash
gh run list --repo dknauss/agent-skills --workflow Release --limit 5
gh release view v0.1.2 --repo dknauss/agent-skills
```

If the workflow fails, create the release directly:

```bash
gh api repos/dknauss/agent-skills/releases -X POST \
  -H 'Accept: application/vnd.github+json' \
  -f tag_name='v0.1.2' \
  -f target_commitish='trunk' \
  -f name='v0.1.2'
```

## Branch Protection

`trunk` should require the `validate` check before merge.

Recommended protection settings:

- Require a pull request before merging
- Require status checks to pass before merging
- Required check: `validate`
- Require branches to be up to date before merging
- Do not allow force pushes
- Do not allow deletions

Reference command:

```bash
gh api repos/dknauss/agent-skills/branches/trunk/protection -X PUT \
  -H 'Accept: application/vnd.github+json' \
  --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["validate"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
```

## Upstream Sync

Normal source refresh flow:

```bash
git fetch upstream
git checkout main
git pull --ff-only upstream trunk
git checkout trunk
git merge main
```

After any upstream sync:

1. Re-run the local validation commands.
2. Check whether shared version indices or references changed.
3. Review any skill behavior that depends on upstream WordPress docs or tooling.

## Known Notes

- GitHub license recognition currently resolves to `GPL-2.0`. Keep an eye on this if the repository needs exact `GPL-2.0-or-later` signaling in the future.
- The social preview image is still manual; there is no supported GitHub API for uploading it.

## Next Planning Targets

- Expand high-risk scenarios further for `wp-secure-code`, `wp-rest-api`, and `wp-performance`.
- Consider splitting CI into multiple named jobs if more granular branch-protection contexts become useful.
- Add a maintainer checklist for upstream sync conflict review if sync frequency increases.
