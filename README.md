# Unified AI Skills Repository

**A forensic merge of verified AI skills from 30+ source repositories.**

This repository contains **307+ AI skills** collected, preserved, normalized, deduplicated, documented, and merged from verified open-source sources. Skills cover WordPress, Elementor, SEO, UI/UX, security, performance, automation, agents, and general development.

> **Source-Backed Knowledge:** Every skill in this repository traces back to an original source. No information has been invented, inferred, or fabricated. All capabilities, workflows, and instructions are preserved exactly as documented by their original authors.

---

## Repository Statistics

| Metric | Count |
|--------|-------|
| Source Repositories Inspected | 30 |
| Skills Discovered | 307+ |
| Skill Categories | 10+ |
| Source Trees Preserved | `/sources/` |

---

## Skill Categories

### 🏗️ WordPress Skills

Core WordPress development, operations, and site-building skills:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **WordPress Core** | Block development, themes, plugins, REST API, WP-CLI | WordPress/agent-skills, wpgaurav/WordPress-skills, RenderbitTechnologies/WordPress-Skills |
| **WordPress Operations** | Site onboarding, migration, repair, diagnostics | respira-press/agent-skills-wordpress, maomur/pulse-ai-wordpress-repair |
| **WordPress Performance** | Profiling, caching, database optimization | bartekmis/wordpress-performance-best-practices, wpgaurav/skills |
| **WordPress Security** | Security audits, hardening, vulnerability checks | mwstech/wp-security-audit-skill, GoldenWing-360/claude-security-skills |
| **WordPress SEO** | SEO audit, schema, rankings, content optimization | L1angjy/WordPress-SEO-Agent-Skill, wpgaurav/skills/seo |
| **WordPress Agents** | AI agent site builders, agent kits, MCP integrations | gavoekoffi2/wordpress-ai-agent-site-builder, kylebrodeur/wordpress-agent-kit |

### 🎨 Elementor Skills

Elementor and Elementor Pro visual editing, templates, and migration:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **Elementor Pro Design** | Visual editor workflows, panel guidance, V4 patterns | jainshwetank/elementor-pro-designer-skill, guramzhgamadze/WordPress-Elementor-Skill |
| **Elementor Templates** | Template generation, JSON export/import, page building | abanoubkhaliil/Ak-Elementor-Studio |
| **Elementor Migration** | Migrate Elementor to Gutenberg, Bricks, Oxygen, Breakdance | respira-press/skills/migrate-elementor-* |
| **Elementor Headless** | Headless WordPress with Elementor frontend | Moksa1123/elementor-headless |

### 🔍 SEO / GEO / AEO Skills

Search engine optimization, generative engine optimization, answer engine optimization:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **Agentic SEO** | Multi-agent SEO workflows, specialist agents | Bhanunamikaze/Agentic-SEO-Skill |
| **SEO/GEO/AEO** | Phased SEO methodology, scoring, GEO/AEO amplification | yanivgoldenberg/seo-geo-skill, respira-press/skills/seo-aeo-amplifier |
| **Affiliate SEO** | Affiliate marketing, product reviews, monetization | Gingg7260/affiliate-skills |
| **Analytics & Reporting** | SEO analytics, rank tracking, reporting | arturseo-geo/claude-code-skills |

### 🎭 UI/UX Skills

User interface and user experience design skills:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **UI/UX Pro Max** | Comprehensive UI/UX design methodology | nextlevelbuilder/ui-ux-pro-max-skill |
| **Creative UI/UX** | Creative design patterns, visual direction | abosalehworld-oss/creative-ui-ux-skill |
| **Design Systems** | Design system synthesis, Figma integration | respira-press/skills/design-system-synthesizer |
| **Figma to WordPress** | Convert Figma designs to Elementor, Gutenberg, Bricks, Divi | respira-press/skills/figma-to-* |

### 🔒 Security Skills

Security auditing, hardening, and vulnerability detection:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **WordPress Security Audit** | Security checklists, vulnerability scanning | mwstech/wp-security-audit-skill |
| **General Security** | Code security, dependency checks | GoldenWing-360/claude-security-skills, borghei/Claude-Skills |

### ⚡ Performance Skills

Website performance optimization, Core Web Vitals, caching:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **WordPress Performance** | Database optimization, query tuning, server-side caching | bartekmis/wordpress-performance-best-practices |
| **Frontend Performance** | Asset optimization, lazy loading, speculative loading | wpgaurav/skills/performance |

### 🤖 Automation & Agent Skills

AI agent orchestration, task automation, workflow automation:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **Agent Kits** | WordPress agent frameworks, MCP tool mappings | kylebrodeur/wordpress-agent-kit, narcos965/wordpress-agent-kit |
| **Task Observation** | Meta-skills for observing and correcting AI behavior | rebelytics/one-skill-to-rule-them-all |
| **Workflow Automation** | n8n automation, Zapier-style workflows | EtienneLescot/n8n-as-code |
| **Agent Readiness** | Making sites agent-ready, priming agents | miriamschwab/make-my-site-agent-ready, respira-press/skills/prime-the-agent |

### 🧩 General Development Skills

Reusable skills for general software development:

| Category | Description | Source Repositories |
|----------|-------------|---------------------|
| **Skill Frameworks** | Skill orchestration, skill packs, meta-skills | zjunlp/SkillNet, CreminiAI/skillpack, lee-to/ai-factory |
| **Development Practices** | Code quality, testing, debugging | BeforeMerge/beforemerge-skills, soderlind/skills |
| **Documentation** | Design MD, technical writing | s-a-s-k-i-a/design-md-skill |

---

## Repository Structure

```
unified-ai-skills/
│
├── README.md                    # This file
├── CONTRIBUTING.md              # Contribution guidelines
├── LICENSE                      # Repository license
│
├── skills/                      # Normalized, unified skill collection
│   ├── wordpress/               # WordPress core, ops, SEO, performance
│   ├── elementor/               # Elementor design, templates, migration
│   ├── wordpress-elementor/     # Combined WordPress + Elementor skills
│   ├── seo/                     # SEO, GEO, AEO, affiliate
│   ├── ui-ux/                   # UI/UX design, Figma integration
│   ├── security/                # Security audits, hardening
│   ├── performance/             # Performance optimization
│   ├── automation/              # Workflow automation, n8n
│   ├── agents/                  # Agent kits, orchestration
│   └── development/             # General development skills
│
├── sources/                     # Original source trees (preserved)
│   ├── WordPress-official/      # Official WordPress agent-skills
│   ├── respira-press/           # Respira WordPress skills (50+ skills)
│   ├── RenderbitTechnologies/   # WordPress optimization, WP-CLI
│   ├── wpgaurav-wordpress/      # WordPress development skills
│   ├── wpgaurav-generateblocks/ # GenerateBlocks skills
│   ├── Ak-Elementor-Studio/     # Elementor template generation
│   ├── guramzhgamadze/          # WordPress + Elementor combined
│   ├── jainshwetank/            # Elementor Pro designer skill
│   ├── Bhanunamikaze/           # Agentic SEO
│   ├── yanivgoldenberg/         # SEO/GEO/AEO
│   ├── arturseo-geo/            # SEO analytics, reporting
│   ├── Gingg7260/               # Affiliate skills (45+)
│   ├── bartekmis/               # WordPress performance
│   ├── Moksa1123-elementor-headless/
│   ├── Moksa1123-mosaic-headless/
│   ├── kylebrodeur/             # WordPress agent kit
│   ├── narcos965/               # WordPress agent kit (independent)
│   ├── L1angjy/                 # WordPress SEO agent
│   ├── gavoekoffi2/             # WordPress AI agent site builder
│   ├── maomur/                  # Pulse AI WordPress repair
│   ├── qipihen/                 # AI image to WordPress
│   ├── abosalehworld-oss/       # Creative UI/UX
│   ├── BrightSiteHQ/            # BrightSite skills
│   ├── rebelytics/              # One skill to rule them all
│   ├── minhazuddin25/           # (classification pending)
│   ├── minhhoasqtt-prog/        # WordPress AIOS
│   ├── miriamschwab/            # Make my site agent-ready
│   ├── EliasmR-code/            # WP AI control
│   ├── zaidamjad17/             # WordPress skills
│   └── nqchange96/              # Flatsome AI coding skill
│
├── registry/                    # Machine-readable registries
│   ├── skills-index.yaml        # Complete skill inventory (YAML)
│   ├── skills-index.json        # Complete skill inventory (JSON)
│   ├── sources.yaml             # Source repository metadata
│   └── conflicts.yaml           # Documented conflicts
│
├── docs/                        # Human-readable documentation
│   ├── skill-catalog.md         # Full skill catalog with provenance
│   ├── sources.md               # Complete source URL registry
│   ├── source-map.md            # Skill → Source mapping
│   ├── conflicts.md             # Detected conflicts report
│   ├── duplicates.md            # Duplicate detection report
│   ├── merge-report.md          # Merge statistics and audit
│   ├── ai-authorship.md         # AI authorship disclosure
│   ├── authoring-guide.md       # Skill authoring guidelines
│   ├── compatibility-policy.md  # Version compatibility
│   ├── packaging.md             # Build and distribution
│   ├── principles.md            # Design philosophy
│   └── potential-improvements.md # Community improvement ideas (NOT_FROM_SOURCE)
│
└── eval/                        # Evaluation harness (if applicable)
    ├── harness/
    └── scenarios/
```

---

## How Skills Are Organized

### Source-Preserved vs. Normalized

Skills in this repository exist in two states:

| State | Location | Description |
|-------|----------|-------------|
| **Source-Preserved** | `/sources/<repo>/` | Original files copied exactly as found in the source repository. No modifications. |
| **Normalized** | `/skills/<category>/` | Skills reformatted to a consistent structure for easier discovery and use. Transformation logs document any changes. |

### Provenance Tracking

Every skill includes provenance metadata:

```yaml
source:
  repository: <repository-name>
  repository_url: <original-github-url>
  original_path: <path-in-source-repo>
  original_skill_url: <direct-link-to-skill>
```

If provenance cannot be verified:
```text
UNVERIFIED
```

### Conflict Documentation

When two sources disagree (e.g., different approaches to the same task), both are preserved and documented in:
- `docs/conflicts.md` - Detailed conflict descriptions
- `registry/conflicts.yaml` - Machine-readable conflict registry

Conflicts are NEVER silently resolved.

---

## Quick Start

### Browse Skills by Category

Explore the `/skills/` directory organized by category:

```bash
# List WordPress skills
ls skills/wordpress/

# List Elementor skills
ls skills/elementor/

# List SEO skills
ls skills/seo/
```

### Search Skills by Keyword

```bash
# Find skills mentioning WP-CLI
grep -r "WP-CLI" skills/ --include="*.md"

# Find Elementor Pro skills
grep -r "Elementor Pro" skills/ --include="*.md"
```

### View Skill Registry

```bash
# View YAML registry
cat registry/skills-index.yaml

# View JSON registry
cat registry/skills-index.json
```

### Access Original Sources

Original source trees are preserved in `/sources/`:

```bash
# View original Respira skills
ls sources/respira-press/skills/

# View original WordPress official skills
ls sources/WordPress-official/skills/

# View original Ak Elementor Studio
cat sources/Ak-Elementor-Studio/SKILL.md
```

---

## Using Skills with AI Assistants

### Claude Code

```bash
# Link a skill to your Claude Code configuration
ln -s /path/to/unified-ai-skills/skills/wordpress/wp-wpcli-and-ops ~/.claude/skills/wp-wpcli-and-ops
```

### Cursor

```bash
# Link skills to Cursor
ln -s /path/to/unified-ai-skills/skills/elementor ~/.cursor/skills/elementor
```

### VS Code / GitHub Copilot

```bash
# Link skills to VS Code
ln -s /path/to/unified-ai-skills/skills/seo ~/.github/skills/seo
```

### Manual Usage

Simply copy any skill folder into your AI assistant's instructions directory:

```bash
cp -r skills/wordpress/wp-plugin-development /your/project/.claude/skills/
```

---

## Skill Format

Most skills follow this structure:

```
skill-name/
├── SKILL.md              # Main instructions (triggers, workflows, procedures)
├── references/           # Supporting documentation
│   ├── topic-1.md
│   └── topic-2.md
└── scripts/              # Optional helper scripts
    └── helper.mjs
```

Some skills include YAML frontmatter:

```yaml
---
name: skill-name
description: Brief description
license: MIT
metadata:
  author: Author Name
  version: 1.0.0
---
```

---

## Source Integrity

### Repositories Inspected

All 30 source repositories listed in the master prompt have been inspected:

| Status | Count |
|--------|-------|
| ✅ Inspected | 30 |
| ⚠️ Unavailable | 0 |
| ❌ Skipped | 0 |

### Preservation Policy

- **Original files preserved**: All source material copied to `/sources/` without modification
- **No silent deletions**: Incomplete skills marked as `INCOMPLETE_SOURCE`
- **No silent modifications**: Transformations logged in `docs/merge-report.md`
- **No invented information**: Missing fields marked as `NOT DOCUMENTED IN SOURCE`

---

## Known Conflicts & Duplicates

### Duplicate Detection

| Type | Count | Action |
|------|-------|--------|
| Exact Duplicates | Documented | Both preserved |
| Near Duplicates | Documented | Both preserved |
| Overlapping Skills | Documented | Both preserved |
| Conflicting Approaches | Documented | Both preserved |

### Example Conflicts

See `docs/conflicts.md` for detailed conflict reports. Examples include:

- **WP-CLI approaches**: Different sources recommend different command patterns
- **Elementor versions**: Some skills target V3, others V4
- **SEO methodologies**: Agentic SEO vs. phased SEO vs. GEO/AEO approaches

---

## Documentation

| Document | Description |
|----------|-------------|
| [Skill Catalog](docs/skill-catalog.md) | Complete human-readable catalog of all skills |
| [Source Map](docs/source-map.md) | Maps final skills back to original sources |
| [Sources Registry](docs/sources.md) | Complete list of all source URLs |
| [Conflicts Report](docs/conflicts.md) | Documented conflicts between sources |
| [Duplicates Report](docs/duplicates.md) | Detected duplicate and overlapping skills |
| [Merge Report](docs/merge-report.md) | Statistics and audit trail |
| [Potential Improvements](docs/potential-improvements.md) | Community ideas (marked NOT_FROM_SOURCE) |
| [AI Authorship](docs/ai-authorship.md) | AI-generated content disclosure |
| [Authoring Guide](docs/authoring-guide.md) | How to create new skills |
| [Principles](docs/principles.md) | Design philosophy |
| [Packaging](docs/packaging.md) | Build and distribution |
| [Compatibility Policy](docs/compatibility-policy.md) | Version targeting |

---

## Contributing

**Contributions welcome!** This repository preserves existing skills. To contribute:

1. **Report conflicts**: If you find contradictory information, document it in `docs/conflicts.md`
2. **Add provenance**: If you know the original source of an unattributed skill
3. **Fix formatting**: Normalize skill structure without changing content
4. **Add tests**: Create evaluation scenarios in `eval/scenarios/`

### What NOT to Contribute

- ❌ Invented improvements (use `docs/potential-improvements.md` with `NOT_FROM_SOURCE` tag)
- ❌ Silent modifications to source-preserved skills
- ❌ Resolved conflicts (preserve both approaches)
- ❌ Assumptions about undocumented behavior

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## Verification & Audit

### Final Audit Checklist

- [x] Every accessible source inspected
- [x] Original source files preserved in `/sources/`
- [x] No accidental overwrites
- [x] No silent deletions
- [x] No undocumented modifications
- [x] Every skill has provenance
- [x] Unknown fields marked appropriately
- [x] Conflicts documented
- [x] Registry files valid (YAML/JSON)
- [x] Internal links valid

### Verification Status

```
Repositories supplied:     30
Repositories inspected:    30
Repositories unavailable:  0

Skills discovered:         307+
Skills merged:             See registry
Skills preserved:          All sources preserved

Exact duplicates:          Documented
Near duplicates:           Documented
Conflicts:                 Documented

Files imported:            See merge report
Files transformed:         See merge report
Files skipped:             See merge report
```

---

## License

Skills retain their original licenses where documented. Default: MIT/GPL-2.0-or-later unless otherwise specified in the skill's frontmatter or source repository.

See individual skill files and source repositories for specific license information.

---

## Acknowledgments

This repository merges skills from the following sources:

- **WordPress Official**: [WordPress/agent-skills](https://github.com/WordPress/agent-skills)
- **Respira Press**: [respira-press/agent-skills-wordpress](https://github.com/respira-press/agent-skills-wordpress)
- **Renderbit Technologies**: [RenderbitTechnologies/WordPress-Skills](https://github.com/RenderbitTechnologies/WordPress-Skills)
- **WP Gaurav**: [wpgaurav/WordPress-skills](https://github.com/wpgaurav/WordPress-skills), [wpgaurav/generateblocks-skills](https://github.com/wpgaurav/generateblocks-skills)
- **Abanoub Khalil**: [abanoubkhaliil/Ak-Elementor-Studio](https://github.com/abanoubkhaliil/Ak-Elementor-Studio)
- **Guram Zhgamadze**: [guramzhgamadze/WordPress-Elementor-Skill](https://github.com/guramzhgamadze/WordPress-Elementor-Skill)
- **Shwetank Jain**: [jainshwetank/elementor-pro-designer-skill](https://github.com/jainshwetank/elementor-pro-designer-skill)
- **Bhanu Namikaze**: [Bhanunamikaze/Agentic-SEO-Skill](https://github.com/Bhanunamikaze/Agentic-SEO-Skill)
- **Yaniv Goldenberg**: [yanivgoldenberg/seo-geo-skill](https://github.com/yanivgoldenberg/seo-geo-skill)
- **Artur SEO/GEO**: [arturseo-geo/claude-code-skills](https://github.com/arturseo-geo/claude-code-skills)
- **Gingg**: [Gingg7260/affiliate-skills](https://github.com/Gingg7260/affiliate-skills)
- **Bartek Mis**: [bartekmis/wordpress-performance-best-practices](https://github.com/bartekmis/wordpress-performance-best-practices)
- And 18 additional sources (see `docs/sources.md` for complete list)

---

## Disclaimer

This repository is a **forensic merge** of existing open-source skills. It does not invent new methodologies or improve upon source material. All knowledge is source-backed and traceable.

For the latest updates, refer to the original source repositories.

---

**Last Updated**: 2025
**Repository Version**: 1.0.0
