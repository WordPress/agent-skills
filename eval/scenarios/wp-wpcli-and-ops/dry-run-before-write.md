# Dry Run Before Write

Skill: wp-wpcli-and-ops

Destructive WP-CLI operations must be preceded by a dry run or backup. This prevents data loss from typos, wrong targets, or unexpected scope.

## search-replace uses --dry-run first

**Given** a `wp search-replace` command
**When** the command is prepared
**Then** the first invocation must include `--dry-run`

### Examples

Pass:
```bash
# Step 1: Dry run
wp search-replace 'old-domain.com' 'new-domain.com' --dry-run --report-changed-only

# Step 2: Verify output, then execute
wp search-replace 'old-domain.com' 'new-domain.com' --report-changed-only
```

Fail:
```bash
wp search-replace 'old-domain.com' 'new-domain.com'
```
No dry run, no `--report-changed-only`. The operator has no preview of what changes and no way to verify scope before committing to production data.

## Database export before destructive operations

**Given** a command that modifies or deletes database content
**When** the command is part of an operational procedure
**Then** a `wp db export` step must precede the destructive command

### Examples

Pass:
```bash
# Backup first
wp db export backup-$(date +%Y%m%d-%H%M%S).sql

# Then modify
wp post delete $(wp post list --post_status=trash --format=ids) --force
```

Fail:
```bash
wp post delete $(wp post list --post_status=trash --format=ids) --force
```
No backup. If the `post list` query returns unexpected IDs (wrong `--post_status`, missing filter), published content could be destroyed with no recovery path.

## Plugin updates use --dry-run

**Given** a bulk plugin update command
**When** the command is prepared
**Then** `--dry-run` should be used first to preview which plugins will be updated

### Examples

Pass:
```bash
# Preview
wp plugin update --all --dry-run

# Execute after review
wp plugin update --all
```

Fail:
```bash
wp plugin update --all
```
No preview. A breaking update to a critical plugin could take down the site without the operator knowing which plugin was responsible.
