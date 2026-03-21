# Blueprint Mounts Plugin

Skill: wp-playground

Playground guidance should use blueprints or CLI flows that reproduce the target plugin or theme state.

## Playground plan includes reproducible setup

**Given** a request to test a plugin in WordPress Playground
**When** the skill proposes the workflow
**Then** it should describe a reproducible blueprint or CLI-based setup that mounts or installs the plugin and sets the desired WordPress version

### Examples

Pass:
```markdown
Use a Playground blueprint that sets the WordPress version, mounts the local plugin, and activates it before running the scenario.
```

Fail:
```markdown
Open a random Playground instance in the browser and click around until the plugin appears.
```
This is not reproducible and does not encode the environment being tested.
