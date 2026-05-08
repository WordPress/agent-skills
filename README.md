# Agent Skills for WordPress

**Teach AI coding assistants how to build WordPress the right way.**

Agent Skills are portable bundles of instructions, checklists, and scripts that help AI assistants (Claude, Copilot, Codex, Cursor, etc.) understand WordPress development patterns, avoid common mistakes, and follow best practices.

> **AI Authorship Disclosure:** These skills were generated using GPT-5.2 Codex (High Reasoning) from official Gutenberg and WordPress documentation, then reviewed and edited by WordPress contributors. We tested skills with AI assistants and iterated based on results. This is v1, and skills will improve as the community uses them and contributes fixes. See [docs/ai-authorship.md](docs/ai-authorship.md) for details. ([WordPress AI Guidelines](https://make.wordpress.org/ai/handbook/ai-guidelines/))

## Why Agent Skills?

AI coding assistants are powerful, but they often:
- Generate outdated WordPress patterns (pre-Gutenberg, pre-block themes)
- Miss critical security considerations in plugin development
- Skip proper block deprecations, causing "Invalid block" errors
- Ignore existing tooling in your repo

Agent Skills solve this by giving AI assistants **expert-level WordPress knowledge** in a format they can actually use.

## Available Skills

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
| **wp-abilities-audit** | Audit a plugin's REST surface and propose Abilities API registrations |
| **wp-abilities-verify** | Verify a plugin's Abilities API registrations against their declared annotations |
| **wp-wpcli-and-ops** | WP-CLI commands, automation, multisite, search-replace |
| **wp-performance** | Profiling, caching, database optimization, Server-Timing |
| **wp-phpstan** | PHPStan static analysis for WordPress projects (config, baselines, WP-specific typing) |
| **wp-playground** | WordPress Playground for instant local environments |
| **wpds** | WordPress Design System |
| **wp-plugin-directory-guidelines** | WordPress Plugin Directory Guidelines |
| **blueprint** | WordPress Playground Blueprints for declarative Playground environment setup |

## Quick Start

### Install globally for Claude Code

```bash
# Clone agent-skills
git clone https://github.com/WordPress/agent-skills.git
cd agent-skills

# Build the distribution
node shared/scripts/skillpack-build.mjs --clean

# Install all skills globally (available across all projects)
node shared/scripts/skillpack-install.mjs --global

# Or install specific skills only
node shared/scripts/skillpack-install.mjs --global --skills=wp-playground,wp-block-development
```

This installs skills to `~/.claude/skills/` where Claude Code will automatically discover them.

### Install into your repo

```bash
# Clone agent-skills
git clone https://github.com/WordPress/agent-skills.git
cd agent-skills

# Build the distribution
node shared/scripts/skillpack-build.mjs --clean

# Install into your WordPress project
node shared/scripts/skillpack-install.mjs --dest=../your-wp-project --targets=codex,vscode,claude,cursor
```

This copies skills into:
- `.codex/skills/` for OpenAI Codex
- `.github/skills/` for VS Code / GitHub Copilot
- `.claude/skills/` for Claude Code (project-level)
- `.cursor/skills/` for Cursor (project-level)

### Install globally for Cursor

```bash
node shared/scripts/skillpack-install.mjs --targets=cursor-global
```

This installs skills to `~/.cursor/skills/` where Cursor will discover them.

### Available options

```bash
# List available skills
node shared/scripts/skillpack-install.mjs --list

# Dry run (preview without installing)
node shared/scripts/skillpack-install.mjs --global --dry-run

# Install specific skills to a project (e.g. Claude + Cursor)
node shared/scripts/skillpack-install.mjs --dest=../my-repo --targets=claude,cursor --skills=wp-wpcli-and-ops
```

### Manual installation

Copy any skill folder from `skills/` into your project's instructions directory for your AI assistant.

## How It Works

Each skill contains:

```
skills/wp-block-development/
├── SKILL.md              # Main instructions (when to use, procedure, verification)
├── references/           # Deep-dive docs on specific topics
│   ├── block-json.md
│   ├── deprecations.md
│   └── ...
└── scripts/              # Deterministic helpers (detection, validation)
    └── list_blocks.mjs
```

When you ask your AI assistant to work on WordPress code, it reads these skills and follows the documented procedures rather than guessing.

## Compatibility

- **WordPress 6.9+** (PHP 7.2.24+)
- Works with any AI assistant that supports project-level instructions

## Contributing

**We welcome contributions!** This project is a great way to share your WordPress expertise—you don't need to be a coding wizard. Most skills are written in Markdown, focusing on clear procedures and best practices.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to get started.

Quick commands:

```bash
# Scaffold a new skill
node shared/scripts/scaffold-skill.mjs <skill-name> "<description>"

# Validate skills
node eval/harness/run.mjs
```

## Documentation

- [Authoring Guide](docs/authoring-guide.md) - How to create and improve skills
- [Principles](docs/principles.md) - Design philosophy
- [Packaging](docs/packaging.md) - Build and distribution
- [Compatibility Policy](docs/compatibility-policy.md) - Version targeting

## License

GPL-2.0-or-later
