---
name: wp-github-actions
description: |
  Sets up GitHub Actions CI/CD workflows for WordPress plugins — coding standards (WPCS/PHPCS), PHP/JS/CSS linting, PHPUnit testing, static analysis (PHPStan), Composer security scanning, WordPress Playground PR previews, and automated deployment to WordPress.org. ALWAYS use this skill when a user wants to create, add, set up, or configure GitHub Actions, CI/CD, automated checks, or deployment workflows for a WordPress plugin — even if they don't use the exact phrase "GitHub Actions". This includes any request to: add automated coding standards or PHPCS/WPCS checks to a WP plugin repo; set up linting (PHP, JS, CSS) for a WordPress plugin; configure PHPUnit testing in CI for a plugin; auto-deploy a plugin to WordPress.org from GitHub; add Playground previews to pull requests; add security scanning or static analysis to a plugin pipeline; or generally "add CI", "add automated checks", "set up workflows", or "automate" anything related to a WordPress plugin's GitHub repository. Also trigger when someone mentions wanting to stop doing manual SVN deploys, wants quality gates on PRs, or is setting up a new WordPress plugin repo and wants best practices for automation. If the user is inside a WordPress plugin repository and mentions anything about automated testing, code quality, deployment, or GitHub workflows, use this skill.
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Requires GitHub Actions. Some workflows use 10up actions, Composer, and Node.js."
---

# WordPress Plugin GitHub Actions

This skill helps you set up a comprehensive CI/CD pipeline for WordPress plugins using GitHub Actions. The goal is to help plugin authors ship higher-quality code with less manual effort.

## What this skill covers

There are several categories of workflows that a healthy WordPress plugin should have. Not every plugin needs all of them — the right mix depends on the plugin's complexity, whether it has JavaScript/CSS assets, whether it uses Composer, etc. Your job is to figure out which ones are relevant and set them up.

The workflows fall into these categories:

1. **Code quality** — WPCS/PHPCS checks, PHP linting, JS/CSS linting
2. **Testing** — PHPUnit with WordPress test library
3. **Static analysis** — PHPStan with WordPress extensions
4. **Dependency management** — Composer diff on PRs, security scanning
5. **Preview** — WordPress Playground PR previews
6. **Deployment** — Automated deploy to WordPress.org on tag/release

Read `references/workflows.md` for the detailed configuration of each workflow, including ready-to-use YAML templates and configuration files.

## How to approach a request

### Step 1: Understand the plugin

Before writing any workflow files, figure out what you're working with:

- **Does the plugin use Composer?** Check for `composer.json`. If yes, Composer-related workflows (diff, security, autoloading) are relevant.
- **Does it have JavaScript/CSS assets?** Check for `package.json`, any JS/CSS source files, or a build process. If yes, JS/CSS linting and possibly a build step matter.
- **Does it have tests?** Check for a `tests/` directory, `phpunit.xml`, or `phpunit.xml.dist`. If yes, set up the PHPUnit workflow. If not, mention that adding tests would be valuable but don't force it.
- **Is it on WordPress.org?** Check for a `.wordpress-org` directory or ask. If yes, the deploy workflow is relevant and you should also set up `.distignore`.
- **What PHP versions should it support?** WordPress itself requires PHP 7.4+, but many plugins target 7.4, 8.0, 8.1, 8.2, and 8.3. Check the plugin's readme or ask.
- **What WordPress versions?** Similarly, check what WP versions the plugin declares compatibility with.

### Step 2: Recommend a set of workflows

Based on what you found, recommend which workflows to set up. A good default for most plugins:

- WPCS check (almost always)
- PHP lint (almost always — catches syntax errors across PHP versions)
- PHPUnit tests (if tests exist)
- Deploy to WordPress.org (if on WordPress.org)
- Playground PR preview (nice to have for any plugin)

And conditionally:

- JS/CSS linting (if the plugin has frontend assets)
- Composer diff + security (if using Composer)
- PHPStan (for plugins that want deeper static analysis)

### Step 3: Create the workflow files

Create each workflow as a separate YAML file in `.github/workflows/`. Using separate files rather than one monolithic workflow gives clearer feedback in PRs (each check shows independently) and makes it easier to enable/disable individual checks.

Use the templates from `references/workflows.md` as starting points, but adapt them to the specific plugin. Common adaptations include adjusting PHP version matrices, changing the WPCS standard, adjusting file paths, and tweaking the deploy workflow for plugins with build steps.

### Step 4: Create supporting config files

Depending on which workflows you set up, you may also need:

- `phpcs.xml.dist` — Custom PHPCS ruleset (if the plugin needs rule exclusions or custom config)
- `.distignore` — Files to exclude from WordPress.org deployment
- `phpstan.neon` or `phpstan.neon.dist` — PHPStan configuration

### Step 5: Set up secrets reminder

If you're adding the deploy workflow, remind the user that they need to configure two repository secrets in GitHub:

- `SVN_USERNAME` — Their WordPress.org username
- `SVN_PASSWORD` — Their WordPress.org password

Walk them through: Repository Settings > Secrets and variables > Actions > New repository secret.

## Naming conventions

Use descriptive workflow file names that make it obvious what each one does:

- `wpcs.yml` — WordPress Coding Standards
- `phpunit.yml` — PHPUnit tests
- `lint-php.yml` — PHP syntax linting
- `lint-js-css.yml` — JavaScript and CSS linting
- `phpstan.yml` — Static analysis
- `composer-diff.yml` — Composer dependency diff on PRs
- `security.yml` — Composer security scanning
- `playground-preview.yml` — WordPress Playground PR preview
- `deploy.yml` — Deploy to WordPress.org

## Important details

**Branch naming**: Many WordPress plugin repos use `trunk` as the default branch (mirroring WordPress.org SVN conventions), while others use `main` or `master`. Always check the actual repo and use the correct branch name in workflow triggers.

**PHP version matrix**: WordPress 6.x requires PHP 7.4+. A good default matrix is `['7.4', '8.0', '8.1', '8.2', '8.3']` for PHPUnit, but use only the latest stable PHP for WPCS and linting (they don't need a matrix).

**WordPress version matrix**: For PHPUnit, test against at least `latest` and consider adding the previous major version. Some plugins also test against `nightly` to catch upcoming issues early.

**The 10up ecosystem**: 10up maintains a set of well-maintained GitHub Actions specifically for WordPress. Prefer these over generic alternatives when they exist — they handle WordPress-specific edge cases well. The key ones are `10up/wpcs-action` for coding standards and `10up/action-wordpress-plugin-deploy` for deployment.
