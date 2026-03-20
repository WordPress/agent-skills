# Baseline Management

Skill: wp-phpstan

PHPStan baselines must shrink over time, never grow. A growing baseline means new technical debt is being introduced faster than old debt is resolved.

## Baseline included in config

**Given** a WordPress project with a PHPStan baseline
**When** `phpstan.neon.dist` is configured
**Then** the baseline file must be explicitly included

### Examples

Pass:
```neon
includes:
    - phpstan-baseline.neon
    - vendor/szepeviktor/phpstan-wordpress/extension.neon
```

Fail:
```neon
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon
```
Baseline exists in the repo but is not included in the config. PHPStan will report all suppressed errors as new failures.

## Baseline committed to version control

**Given** a PHPStan baseline file
**When** the project is committed
**Then** `phpstan-baseline.neon` must be tracked in git (not gitignored)

### Examples

Pass:
```
# .gitignore
vendor/
node_modules/
```
Baseline not in .gitignore — it will be committed and shared.

Fail:
```
# .gitignore
vendor/
node_modules/
phpstan-baseline.neon
```
Gitignored baseline means each developer generates their own, defeating the purpose of shared error tracking.

## New code does not add to baseline

**Given** a PR that modifies PHP source code
**When** PHPStan runs in CI
**Then** the baseline error count must not increase compared to the base branch

### Examples

Pass:
```
# CI output
PHPStan baseline: 42 errors (unchanged from main)
```

Fail:
```
# CI output
PHPStan baseline: 45 errors (was 42 on main)
```
Three new errors introduced. The PR should fix these before merging, or the baseline becomes a dumping ground.
