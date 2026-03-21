# Agent Skills for WordPress

Fork of [WordPress/agent-skills](https://github.com/WordPress/agent-skills) with additional skills from [Dan Knauss](https://github.com/dknauss) and other sources.

This is the canonical skill repo for all WordPress agent work in this environment. Any AI agent (Claude, Codex, Cursor, Copilot) working on WordPress code or docs pulls skill definitions from here.

## Sources

| Source | Skills | Notes |
|--------|--------|-------|
| [WordPress/agent-skills](https://github.com/WordPress/agent-skills) | 13 upstream skills | Tracked on `main`; fork additions on `trunk` |
| [jdevalk/skills](https://github.com/jdevalk/skills) | wp-github-actions, wp-readme-optimizer, github-repo, github-profile | Ported and adapted from Joost de Valk. |
| [elvismdev/claude-wordpress-skills](https://github.com/elvismdev/claude-wordpress-skills) | wp-performance-review | Created by [Elvis Morales](https://github.com/elvismdev); ported and adapted. |
| This fork | wp-accessibility, wp-performance, wp-secure-code, wp-vip-standards, security-researcher, wordpress-security-doc-editor, wordpress-runbook-ops, studio, studio-xdebug, local-studio-env | Original skills by Dan Knauss and Claude |

## Available Skills

### WordPress Development

| Skill | What it teaches |
|-------|-----------------|
| **wordpress-router** | Classifies WordPress repos and routes to the right workflow |
| **wp-project-triage** | Detects project type, tooling, and versions automatically |
| **wp-block-development** | Gutenberg blocks: `block.json`, attributes, rendering, deprecations |
| **wp-block-themes** | Block themes: `theme.json`, templates, patterns, style variations |
| **wp-plugin-development** | Plugin architecture, hooks, settings API, security |
| **wp-rest-api** | REST API routes/endpoints, schema, auth, and response shaping |
| **wp-interactivity-api** | Frontend interactivity with `data-wp-*` directives and stores |
| **wp-abilities-api** | Capability-based permissions and REST API authentication |
| **wpds** | WordPress Design System components and tokens |

### Operations and Tooling

| Skill | What it teaches |
|-------|-----------------|
| **wp-wpcli-and-ops** | WP-CLI commands, automation, multisite, search-replace |
| **wp-phpstan** | PHPStan static analysis for WordPress projects |
| **wp-playground** | WordPress Playground for instant local environments |
| **wp-github-actions** | GitHub Actions CI/CD for WP plugins: WPCS, PHPUnit, PHPStan, Playground previews, deploy to .org |
| **wp-readme-optimizer** | Audit and rewrite WordPress.org plugin readme.txt for visibility and conversions |

### Quality: Accessibility, Security, Performance, and Documentation

| Skill | What it teaches |
|-------|-----------------|
| **wp-accessibility** | WCAG 2.2 AA compliance: semantic HTML, focus management, ARIA, screen-reader-text, testing |
| **wp-secure-code** | Secure code baseline analysis for all WordPress projects: sanitization, escaping, nonces, capability checks, `$wpdb->prepare()`, REST permission callbacks, OWASP top 10 in WP context, WPCS security sniffs, PHP compatibility.  |
| **wp-vip-standards** | WordPress VIP platform-specific standards: banned functions, required alternatives, caching requirements, read-only filesystem constraints, `WordPress-VIP-Go` PHPCS ruleset. Builds on `wp-secure-code` as a prerequisite |
| **wp-performance** | Profiling, caching, database optimization, Server-Timing |
| **wp-performance-review** | Performance code review: anti-pattern detection, severity-rated findings |
| **security-researcher** | Produces source-grounded internal research briefs about vendor-specific WordPress security products, hosting stacks, and platform guidance. Separates verified vendor claims from editorial implications. Output is editorial input (what should our docs say?), not code analysis. Uses [Veloria](https://veloria.dev) to check code against actual WordPress source. |
| **wordpress-security-doc-editor** | Draft, revise, and fact-check WordPress security documentation and the code it contains. |
| **wordpress-runbook-ops** | Operations runbooks with WP-CLI steps, verification, rollback, escalation |

### Local Development Environments

| Skill | What it teaches |
|-------|-----------------|
| **studio** | WordPress Studio: site management, appdata-v1.json, SQLite, Playwright, conflict resolution |
| **studio-xdebug** | Xdebug in Studio: step debugging, stack traces, port 9003 conflicts |
| **local-studio-env** | Studio + Local by Flywheel coexistence: ports, SSL, MySQL sockets, custom domains |

### Developer Tools

General-purpose skills not specific to WordPress.

| Skill | What it teaches |
|-------|-----------------|
| **github-repo** | Audit and improve GitHub repo quality: README, templates, community health files |
| **github-profile** | Optimize GitHub profile pages: profile README, pinned repos, bio |

## Repo Structure

```
agent-skills/
├── skills/
│   └── <skill-name>/
│       ├── SKILL.md              # Main instructions (when to use, procedure, verification)
│       ├── agents/               # Editor-specific agent configs
│       │   ├── claude.yaml
│       │   └── openai.yaml
│       ├── references/           # Canonical source links and deep-dive docs
│       │   └── canonical-sources.md
│       └── scripts/              # Deterministic helpers (some skills)
├── eval/
│   ├── README.md                 # Eval harness documentation
│   ├── harness/                  # Test runner
│   └── scenarios/                # BDD-style pass/fail test cases per skill
├── shared/
│   └── scripts/
│       ├── skillpack-build.mjs   # Build distribution packages
│       ├── skillpack-install.mjs # Install skills globally or into a project
│       └── scaffold-skill.mjs    # Scaffold a new skill directory
└── docs/
    ├── authoring-guide.md        # How to create and improve skills
    ├── principles.md             # Design philosophy
    ├── packaging.md              # Build and distribution
    └── compatibility-policy.md   # Version targeting
```

## Installation

### Global install for Claude Code

```bash
node shared/scripts/skillpack-build.mjs --clean
node shared/scripts/skillpack-install.mjs --global
```

Installs to `~/.claude/skills/` where Claude Code discovers them automatically.

### Install into a project

```bash
node shared/scripts/skillpack-install.mjs --dest=../your-wp-project --targets=codex,vscode,claude,cursor
```

### Other options

```bash
# List available skills
node shared/scripts/skillpack-install.mjs --list

# Install specific skills only
node shared/scripts/skillpack-install.mjs --global --skills=wp-playground,wp-block-development

# Global install for Cursor
node shared/scripts/skillpack-install.mjs --targets=cursor-global

# Dry run
node shared/scripts/skillpack-install.mjs --global --dry-run
```

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Tracks upstream `WordPress/agent-skills` |
| `trunk` | Working branch with all fork additions |
| Feature branches | PRs to upstream go from feature branches against `main` |

## Compatibility

- WordPress 6.9+ (PHP 7.2.24+)
- Works with any AI assistant that supports project-level instructions

## License

GPL-2.0-or-later — same as upstream.
