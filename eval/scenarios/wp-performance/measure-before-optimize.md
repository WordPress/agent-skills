# Measure Before Optimize

Skill: wp-performance

Performance changes without measurement are guesses. Establish baselines before optimizing and verify improvements after.

## Baseline captured before changes

**Given** a performance optimization task
**When** work begins
**Then** baseline metrics must be captured and documented before any code changes

### Examples

Pass:
```markdown
## Performance Baseline (2026-03-20)
- TTFB: 420ms
- Database queries: 47
- Query time: 85ms
- Peak memory: 42MB
- Autoloaded options: 1.2MB

Measured with: `wp profile stage --all --spotlight`
```

Fail:
```markdown
## Changes Made
- Added object caching for post meta lookups
- Reduced query count by batching
```
No baseline. "Reduced query count" compared to what? There's no way to verify the improvement or detect regressions.

## Optimization targets measured bottlenecks

**Given** a baseline measurement showing specific bottlenecks
**When** optimization code is written
**Then** the optimization must target the identified bottleneck, not an assumed one

### Examples

Pass:
```
Baseline: 47 queries, 85ms total query time
Bottleneck: 23 queries from get_post_meta in sidebar (wp profile shows 45ms)
Fix: wp_cache_get_multiple for sidebar meta lookups
Result: 24 queries, 42ms query time
```

Fail:
```
Baseline: 47 queries, 85ms total query time
Fix: Added Redis object cache for all options
Result: 46 queries, 83ms query time
```
Options were already autoloaded efficiently. The optimization targeted a non-bottleneck and achieved negligible improvement.

## Verification after changes

**Given** a performance optimization has been applied
**When** the change is ready for review
**Then** the same metrics must be re-measured and compared to the baseline

### Examples

Pass:
```markdown
## Results
| Metric | Before | After | Change |
|---|---|---|---|
| TTFB | 420ms | 290ms | -31% |
| Queries | 47 | 24 | -49% |
| Query time | 85ms | 42ms | -51% |
```

Fail:
```markdown
## Results
The site feels faster after adding caching.
```
Subjective assessment. "Feels faster" is not a measurement.
