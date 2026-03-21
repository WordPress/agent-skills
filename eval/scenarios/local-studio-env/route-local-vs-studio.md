# Local vs Studio Routing

Skill: local-studio-env

When Studio and Local coexist, the skill should distinguish environment-specific routing and service conflicts before suggesting fixes.

## Troubleshooting identifies which environment owns the site

**Given** a local WordPress site that fails to load
**When** both WordPress Studio and Local by Flywheel are installed
**Then** the skill should determine which tool owns the site and check ports, hosts entries, and SSL for that environment

### Examples

Pass:
```markdown
1. Confirm whether the site lives in WordPress Studio or Local by Flywheel.
2. For Studio, inspect the Studio-managed site path and bundled WP-CLI.
3. For Local, inspect Local's router, site domain, and SSL trust state.
4. Check for port or `/etc/hosts` conflicts between the two tools before changing config.
```

Fail:
```markdown
Reinstall WordPress Studio and flush DNS.
```
This jumps to a destructive fix without first identifying whether Studio or Local owns the site or whether the conflict is shared infrastructure.
