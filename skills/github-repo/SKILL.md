---
name: github-repo
description: >
  Audits and improves GitHub repository quality — README structure, community health files,
  .github directory setup, issue/PR templates, metadata, releases, and branch hygiene.
  Use this skill whenever the user asks to improve, audit, review, or set up a GitHub repository,
  or when they mention things like "make my repo look professional", "add contributing guidelines",
  "set up issue templates", "improve my README", "clean up my repo", "prepare my repo for open source",
  or "make my GitHub project look good". Also trigger when working inside a git repository and
  the user asks about best practices for documentation, community files, or repository structure.
  If the user is in a repo directory and mentions README, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT,
  LICENSE, .github, templates, or release tags, use this skill.
compatibility: "Platform-agnostic. Works with any GitHub repository. No WordPress runtime assumptions. Uses gh CLI when available."
---

# GitHub Repository Optimizer

This skill audits a GitHub repository against best practices and generates or improves the files that make a repo look professional, welcoming, and well-maintained. It works with live repos (via `gh` CLI), local git directories, or files the user provides.

## Workflow

1. **Gather repo context** — Determine what we're working with and collect information
2. **Run the audit** — Score every aspect of the repo's public-facing quality
3. **Generate or improve files** — Produce the files that are missing or need work
4. **Verify** — Confirm the outputs are correct and complete

---

## Phase 0: Gather Context

Figure out what you're working with. Try these sources in order:

### If in a local git directory

Check the current working directory for a `.git` folder. If present:

- Read the existing README.md, CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md, LICENSE, CHANGELOG.md
- Check `.github/` for issue templates, PR templates, workflows, CODEOWNERS, FUNDING.yml, dependabot.yml
- Run `git remote -v` to identify the GitHub remote
- Run `git branch -a` to assess branch hygiene
- Run `git tag --list` to check release tagging

### If `gh` CLI is available and authenticated

Try `gh auth status` first. If authenticated:

- `gh repo view --json name,description,url,homepageUrl,repositoryTopics,licenseInfo,isArchived,defaultBranchRef,stargazerCount,forkCount,hasIssuesEnabled,hasWikiEnabled` — repo metadata
- `gh api repos/{owner}/{repo}/community/profile` — community health score
- `gh api repos/{owner}/{repo}/branches` — branch list for hygiene check
- `gh release list --limit 5` — recent releases
- `gh api repos/{owner}/{repo}/contents/.github` — check for templates and config

If `gh` isn't available or not authenticated, that's fine — work with what you have. Ask the user to provide files or a repo URL only if you have nothing to go on.

### Key information to collect

Before auditing, make sure you understand:

- What the project does (language, framework, purpose)
- Who the audience is (developers, end users, both)
- Whether it's an org repo or personal repo
- Whether it's a library, application, CLI tool, or something else

This context shapes every recommendation. A React component library needs different README sections than a CLI tool or a WordPress plugin.

---

## Phase 1: Audit

Score the repository across these categories. For each, give a score out of 10 and write 2-4 specific, actionable findings that reference the actual content (never be generic).

### Score Table

Present this at the top of the audit:

```text
Category                        Score
─────────────────────────────────────
README Quality                  x/10
Repository Metadata             x/10
Community Health Files          x/10
Issue & PR Templates            x/10
CI/CD & Automation              x/10
Releases & Branch Hygiene       x/10
─────────────────────────────────────
Overall                         x/60
```

**Score ranges:**

- **50–60** — Excellent. Minor polish only.
- **35–49** — Good foundation, real gaps to fill. Optimization will make a visible difference.
- **20–34** — Significant issues. Multiple files need creation or rewriting.
- **0–19** — Bare bones. Treat this as building the repo's public presence from scratch.

### What to evaluate per category

#### README Quality (x/10)

The README is the repo's landing page and the single highest-impact file.

**Structure** — Does it follow a logical flow? The ideal order for a repo README:

1. Logo/project name (centered, for brand recognition)
2. Badge row (build status, coverage, license, version, downloads — aim for 5-10, not more)
3. One-liner description (a compelling elevator pitch, not a generic statement)
4. Visual demo (screenshot, GIF, or terminal recording — this dramatically increases engagement)
5. Quick start (3 steps or fewer to get running)
6. Table of contents (if README exceeds ~200 lines)
7. Installation (step-by-step with code blocks and language-appropriate syntax highlighting)
8. Usage examples (real code showing common use cases, not toy examples)
9. Configuration (environment variables, config files, options)
10. Contributing (brief section linking to CONTRIBUTING.md)
11. License (license type with link to full text)

**Content quality** — Is the description clear about what the project does and who it's for? Are code examples copy-pasteable and correct? Is there a visual (screenshot/GIF)?

**Technical details** — Is syntax highlighting used in code blocks? Are links working? Is the length reasonable (under 500 lines, with detailed docs in `/docs` if needed)?

#### Repository Metadata (x/10)

The "About" section fields have outsized impact on discoverability.

- **Repository name** — Is it descriptive and keyword-rich? `react-calendar` is far better than `my-widget`. Lowercase with hyphens.
- **Description** — Is it filled in? Is it keyword-rich and concise? An empty description is a red flag.
- **Topics/tags** — Are there at least 6? Mix of technology stack, domain, and purpose. Up to 20 allowed. Don't duplicate the auto-detected primary language.
- **Website URL** — Is there a documentation site, homepage, or live demo linked?
- **Social preview image** — Is a custom image set (1280×640px, 2:1 ratio)? Without one, shared links on social media show a generic avatar. Tools like GitHub Socialify or Canva can generate these.

#### Community Health Files (x/10)

These are the baseline for any serious repository.

- **CONTRIBUTING.md** — Does it exist? Does it explain how to contribute, code style expectations, and the PR process? Does it mention issue/PR templates?
- **SECURITY.md** — Does it exist? Does it direct vulnerability reports to a private channel (email or GitHub Private Vulnerability Reporting), not the public issue tracker? Does it state expected response time?
- **CODE_OF_CONDUCT.md** — Does it exist? The Contributor Covenant (contributor-covenant.org) is the standard recommendation — easy to point to for unwanted behavior and provides a handling framework.
- **LICENSE** — Is there a license file in the repo root? Without one, the code is legally "all rights reserved." Is it appropriate for the project type (MIT, Apache 2.0, GPL v3 are common choices)?
- **SUPPORT.md** — Does it exist? Does it separate bug reports from general support questions?
- **CHANGELOG.md** — Does it follow Keep a Changelog format (Added, Changed, Deprecated, Removed, Fixed, Security)?

For organizations: check if there's a `.github` repository with default health files. A `.github` repo lets you set org-wide defaults for CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md, SUPPORT.md, and FUNDING.yml — so individual repos inherit them automatically.

#### Issue & PR Templates (x/10)

Templates guide contributor quality and prevent incomplete bug reports.

- **Issue templates** — Are there YAML-based issue forms (`.github/ISSUE_TEMPLATE/*.yml`)? These render as structured web forms with dropdowns, checkboxes, and required fields — much better than markdown templates. Check for at least a bug report and feature request template. Are filenames numbered for ordering (e.g., `01-bug-report.yml`, `02-feature-request.yml`)?
- **Template chooser config** — Is there a `config.yml` that optionally disables blank issues and links to external support channels?
- **PR template** — Does `.github/PULL_REQUEST_TEMPLATE.md` exist? Does it include description section, related issue references (`Closes #XXX`), type-of-change checkboxes, testing checklist? Is it concise (overly long templates get ignored)?
- **CODEOWNERS** — Does it exist? Does it define who reviews changes to specific files/directories?

#### CI/CD & Automation (x/10)

Automation signals engineering maturity.

- **GitHub Actions workflows** — Are there CI workflows for testing, linting, building? Passing status badges in the README?
- **Dependency management** — Is Dependabot (`dependabot.yml`) or Renovate configured?
- **Code quality** — Any linting actions, CodeQL, or super-linter?
- **Stale issue management** — Is `actions/stale` or similar configured?

#### Releases & Branch Hygiene (x/10)

- **Releases** — Are there tagged releases with changelogs? Is semantic versioning used?
- **Branch hygiene** — Are there stale branches that should be cleaned up? Dozens of stale branches signal loss of control.
- **`.gitattributes`** — Does it define `export-ignore` for clean release archives?
- **Auto-release** — Is semantic-release or release-please configured for automatic versioning?

---

## Phase 2: Generate or Improve Files

Based on the audit, generate the files that are missing or need improvement. Always ask the user before overwriting existing files.

### File generation order (by impact)

1. README.md (highest impact, do this first)
2. LICENSE (if missing — ask user which license they want)
3. CONTRIBUTING.md
4. SECURITY.md
5. CODE_OF_CONDUCT.md
6. Issue templates (.github/ISSUE_TEMPLATE/)
7. PR template (.github/PULL_REQUEST_TEMPLATE.md)
8. CHANGELOG.md
9. SUPPORT.md
10. .github config files (dependabot.yml, CODEOWNERS, FUNDING.yml)

### README generation guidelines

When writing or rewriting a README:

- Start with the project name and a one-liner that clearly states what it does
- Include a badge row — at minimum: build status, license, version. Use shields.io format
- Add a quick start section that gets someone running in 3 steps or fewer
- Code examples should be complete, copy-pasteable, and use appropriate syntax highlighting
- If the project has a visual component, strongly recommend adding a screenshot or GIF
- Keep it under 500 lines; point to `/docs` for detailed documentation
- Use collapsible `<details>` sections for optional/advanced content

### Community health file guidelines

When generating these files, tailor them to the specific project — avoid generic boilerplate that ignores the project's language, tooling, and conventions.

**CONTRIBUTING.md** should cover:

- How to set up the development environment
- Code style and linting rules (reference actual tools the project uses)
- How to run tests
- PR process and expectations
- Issue labeling conventions if applicable

**SECURITY.md** should include:

- Supported versions (which versions receive security fixes)
- How to report a vulnerability (private email or GitHub Private Vulnerability Reporting)
- Expected response timeline
- Explicit instruction to NOT use the public issue tracker for security issues

**CODE_OF_CONDUCT.md** — Use the Contributor Covenant 2.1 unless the user has a different preference.

### Issue template guidelines

Generate YAML-based issue forms, not markdown templates. Example structure for a bug report:

```yaml
name: Bug Report
description: Report a bug to help us improve
title: "[Bug]: "
labels: ["bug", "triage"]
body:
  - type: markdown
    attributes:
      value: Thanks for reporting a bug! Please fill out the sections below.
  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: A clear description of what the bug is
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen
    validations:
      required: true
  - type: dropdown
    id: severity
    attributes:
      label: Severity
      options:
        - Low (cosmetic, minor inconvenience)
        - Medium (feature partially broken)
        - High (feature completely broken)
        - Critical (data loss, security issue)
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment
      description: Version, OS, browser, etc.
```

Adapt the fields to the specific project type (e.g., a CLI tool wouldn't ask for browser info).

---

## Phase 3: Verify

After generating files:

- If working locally, verify the files are in the correct locations
- Check that all internal links in the README work
- Confirm badge URLs are correctly formatted
- If `gh` is available, remind the user to also update the repo's About section (description, topics, website URL, social preview) — these can't be set via files alone
- Summarize what was created/changed and what the user should do next (commit, push, update GitHub settings)

---

## Organization-Level Setup

If the user mentions they're setting up an organization (not just a single repo), guide them through:

1. **Create a `.github` repository** — public, with default community health files that apply org-wide:
   - `CODE_OF_CONDUCT.md`
   - `CONTRIBUTING.md` (generic enough for all repos)
   - `SECURITY.md`
   - `SUPPORT.md`
   - `FUNDING.yml`
   - Issue and PR templates (note: if an individual repo has ANY files in `.github/ISSUE_TEMPLATE/`, none of the org defaults apply for that repo)

2. **Create `profile/README.md`** in the `.github` repo — this is the organization's public profile page. Different from personal profiles:
   - Should explain what the organization does
   - Link to key repositories
   - Include contact/social links
   - Can use the same enhancement tools as personal profiles (badges, stats)

3. **Create a `.github-private` repository** (optional) — same `profile/README.md` structure but visible only to org members. Use this for internal resources, onboarding links, and private repo navigation.

4. **Verify the organization's domain** — Settings → Verified & approved domains. This displays a verified badge that significantly boosts credibility.

5. **Consider repository rulesets** — the newer, more flexible alternative to branch protection. They support multiple concurrent rulesets, Evaluate mode for testing, and can be imported/exported as JSON. Start in Evaluate mode, track violations, then enforce.
