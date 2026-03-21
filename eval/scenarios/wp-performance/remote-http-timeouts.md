# Remote HTTP Timeouts

Skill: wp-performance

Slow outbound requests are a common backend bottleneck and should be treated explicitly in performance investigations.

## HTTP bottlenecks look at timeouts and call frequency

**Given** a performance issue tied to remote APIs or licensing checks
**When** the skill proposes mitigation
**Then** it should inspect request frequency, caching, and timeout settings before recommending infrastructure changes

### Examples

Pass:
```markdown
Check how often the code calls the remote API, whether responses are cached, and whether the timeout is appropriate for the request path.
```

Fail:
```markdown
Move the site to a larger server.
```
That treats a slow remote dependency as a compute problem instead of fixing the application bottleneck.
