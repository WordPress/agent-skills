# WordPress Plugin GitHub Actions — Workflow Templates

This file contains ready-to-use YAML templates for each workflow type. Adapt paths, PHP versions, and standards to the specific plugin.

## Table of Contents

1. [WPCS / PHPCS Check](#1-wpcs--phpcs-check)
2. [PHP Syntax Linting](#2-php-syntax-linting)
3. [JavaScript and CSS Linting](#3-javascript-and-css-linting)
4. [PHPUnit Testing](#4-phpunit-testing)
5. [PHPStan Static Analysis](#5-phpstan-static-analysis)
6. [Composer Diff on PRs](#6-composer-diff-on-prs)
7. [Composer Security Scanning](#7-composer-security-scanning)
8. [WordPress Playground PR Preview](#8-wordpress-playground-pr-preview)
9. [Deploy to WordPress.org](#9-deploy-to-wordpressorg)
10. [Supporting Config Files](#10-supporting-config-files)

---

## 1. WPCS / PHPCS Check

Uses 10up's WPCS action — no need for Composer or local PHPCS config. Runs on every PR and push to the main branch.

**File: `.github/workflows/wpcs.yml`**

```yaml
name: WordPress Coding Standards

on:
  push:
    branches:
      - trunk
  pull_request:

jobs:
  phpcs:
    name: WPCS
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: WPCS check
        uses: 10up/wpcs-action@stable
        with:
          enable_warnings: true
          standard: 'WordPress'
          only_changed_lines: true
```

### Configuration options

| Input | Default | What it does |
|---|---|---|
| `standard` | `WordPress` | Which standard to use. Options: `WordPress`, `WordPress-Core`, `WordPress-Docs`, `WordPress-Extra`, `WordPress-VIP-Go`, `WordPressVIPMinimum`, `10up-Default` |
| `enable_warnings` | `false` | Show warnings in addition to errors |
| `only_changed_lines` | (empty) | Only lint lines changed in the PR — great for legacy codebases |
| `only_changed_files` | (empty) | Only lint files changed in the PR |
| `paths` | `.` | Space-separated paths to check |
| `excludes` | (empty) | Space-separated paths to exclude |
| `use_local_config` | `false` | Use the repo's `phpcs.xml.dist` if present |
| `extra_args` | (empty) | Additional PHPCS arguments |

### Using a local phpcs.xml.dist

If the plugin has custom rule exclusions, set `use_local_config: 'true'` and create a `phpcs.xml.dist` file (see Supporting Config Files section).

### Note on annotation limits

GitHub allows only 10 warning and 10 error annotations per step. Errors beyond this threshold won't show inline on the PR diff but will still appear in the workflow log.

---

## 2. PHP Syntax Linting

Catches syntax errors across multiple PHP versions. This is cheap to run and catches issues that PHPCS won't.

**File: `.github/workflows/lint-php.yml`**

```yaml
name: PHP Lint

on:
  push:
    branches:
      - trunk
  pull_request:

jobs:
  lint:
    name: PHP ${{ matrix.php }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        php: ['7.4', '8.0', '8.1', '8.2', '8.3']

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          tools: php-parallel-lint

      - name: Lint PHP files
        run: parallel-lint --exclude vendor --exclude node_modules .
```

---

## 3. JavaScript and CSS Linting

For plugins with frontend assets. Uses the `@wordpress/scripts` package which bundles ESLint and Stylelint with WordPress-specific configs.

**File: `.github/workflows/lint-js-css.yml`**

```yaml
name: JS & CSS Lint

on:
  push:
    branches:
      - trunk
  pull_request:

jobs:
  lint:
    name: Lint JS & CSS
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Lint JavaScript
        run: npx wp-scripts lint-js .

      - name: Lint CSS
        run: npx wp-scripts lint-style .
```

### Alternative: standalone ESLint/Stylelint

If the plugin doesn't use `@wordpress/scripts`, set up ESLint and Stylelint directly:

```yaml
      - name: Lint JavaScript
        run: npx eslint "src/**/*.js"

      - name: Lint CSS
        run: npx stylelint "src/**/*.css"
```

---

## 4. PHPUnit Testing

Runs PHPUnit with the WordPress test library. Requires a MySQL/MariaDB service and supports testing across multiple PHP and WordPress versions.

**File: `.github/workflows/phpunit.yml`**

```yaml
name: PHPUnit

on:
  push:
    branches:
      - trunk
  pull_request:

jobs:
  test:
    name: PHP ${{ matrix.php }} / WP ${{ matrix.wp }}
    runs-on: ubuntu-latest

    strategy:
      fail-fast: false
      matrix:
        php: ['7.4', '8.0', '8.1', '8.2', '8.3']
        wp: ['latest']
        include:
          - php: '8.3'
            wp: 'nightly'
          - php: '8.2'
            wp: '6.4'

    services:
      mysql:
        image: mariadb:10.6
        env:
          MARIADB_ROOT_PASSWORD: root
          MARIADB_DATABASE: wordpress_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: ${{ matrix.php }}
          extensions: mbstring, xml, zip, intl, pdo, mysql
          tools: phpunit-polyfills
          coverage: none

      - name: Install Composer dependencies
        run: composer install --prefer-dist --no-progress

      - name: Set up WordPress test library
        uses: jeremybarbet/setup-wordpress-test-library@v1
        with:
          wordpress-version: ${{ matrix.wp }}
          database-name: wordpress_test
          database-user: root
          database-password: root
          database-host: 127.0.0.1

      - name: Run tests
        run: vendor/bin/phpunit
```

### Notes on PHPUnit setup

- The `setup-wordpress-test-library` action handles downloading WordPress and the test suite. Alternatives include manually running the WP CLI scaffold command.
- If the plugin doesn't use Composer, install PHPUnit globally via `tools: phpunit` in the `setup-php` step.
- Set `coverage: xdebug` and add a coverage step if you want code coverage reports.
- The `nightly` WordPress version helps catch issues before the next WP release.

---

## 5. PHPStan Static Analysis

Deeper static analysis that catches type errors, undefined methods, and logic issues. The WordPress extension teaches PHPStan about WP-specific patterns.

**File: `.github/workflows/phpstan.yml`**

```yaml
name: PHPStan

on:
  push:
    branches:
      - trunk
  pull_request:

jobs:
  phpstan:
    name: Static Analysis
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'
          coverage: none

      - name: Install Composer dependencies
        run: composer install --prefer-dist --no-progress

      - name: Run PHPStan
        run: vendor/bin/phpstan analyse --no-progress
```

Requires a `phpstan.neon.dist` config file (see Supporting Config Files section) and the `szepeviktor/phpstan-wordpress` Composer package.

---

## 6. Composer Diff on PRs

Shows a human-readable table of dependency changes whenever `composer.lock` is modified in a PR. Helps reviewers understand what actually changed.

**File: `.github/workflows/composer-diff.yml`**

```yaml
name: Composer Diff

on:
  pull_request:
    paths:
      - composer.lock

jobs:
  diff:
    name: Composer Diff
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Composer Diff
        uses: IonBazan/composer-diff-action@v1
```

---

## 7. Composer Security Scanning

Scans `composer.lock` for known security vulnerabilities. Can run on every push/PR and also on a schedule to catch newly disclosed CVEs.

**File: `.github/workflows/security.yml`**

```yaml
name: Security Check

on:
  push:
    branches:
      - trunk
  pull_request:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6 AM

jobs:
  security:
    name: Composer Security
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Security check
        uses: symfonycorp/security-checker-action@v5
```

### Alternative: composer audit

If on Composer 2.4+, you can use the built-in `composer audit` command instead:

```yaml
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.3'

      - name: Security audit
        run: composer audit
```

---

## 8. WordPress Playground PR Preview

Adds a "Try it in Playground" button to PRs, letting reviewers test changes in a live WordPress environment without any local setup.

**File: `.github/workflows/playground-preview.yml`**

```yaml
name: Playground Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  preview:
    name: Playground Preview
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - name: Add Playground preview
        uses: WordPress/action-wp-playground-pr-preview@v2
        with:
          plugin-path: .
          mode: 'append-to-description'
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

### Configuration options

| Input | What it does |
|---|---|
| `plugin-path` | Path to the plugin directory (`.` if the plugin is at the repo root) |
| `theme-path` | Use this instead of `plugin-path` if it's a theme |
| `mode` | `append-to-description` (updates PR body) or `comment` (posts a comment) |
| `blueprint` | Custom Playground blueprint JSON for advanced setups |
| `description-template` | Custom template with `{{PLAYGROUND_BUTTON}}` placeholder |

### For plugins with a build step

If your plugin requires `npm run build` or similar before it can be used, you'll need a two-workflow approach:

1. A build workflow that creates and uploads the built artifact
2. A preview workflow triggered by `workflow_run` that exposes the artifact via `WordPress/action-wp-playground-expose-artifact-on-public-url` and updates the PR

This is more complex — see the WordPress Playground documentation for the full pattern.

### Important notes

- This works best for plugins that don't require a build process. If the plugin has a build step, consider the two-workflow approach above.
- The preview auto-updates after each commit on the PR.
- The Playground runs entirely in the browser — no server resources needed.

---

## 9. Deploy to WordPress.org

Automatically deploys your plugin to the WordPress.org SVN repository when you create a new tag or GitHub release. Uses the well-maintained 10up action.

**File: `.github/workflows/deploy.yml`**

### Option A: Deploy on tag push

```yaml
name: Deploy to WordPress.org

on:
  push:
    tags:
      - '*'

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to WordPress.org
        uses: 10up/action-wordpress-plugin-deploy@stable
        env:
          SVN_USERNAME: ${{ secrets.SVN_USERNAME }}
          SVN_PASSWORD: ${{ secrets.SVN_PASSWORD }}
```

### Option B: Deploy on GitHub release + create ZIP

```yaml
name: Deploy to WordPress.org

on:
  release:
    types: [published]

permissions:
  contents: write

jobs:
  deploy:
    name: Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to WordPress.org
        id: deploy
        uses: 10up/action-wordpress-plugin-deploy@stable
        with:
          generate-zip: true
        env:
          SVN_USERNAME: ${{ secrets.SVN_USERNAME }}
          SVN_PASSWORD: ${{ secrets.SVN_PASSWORD }}

      - name: Upload release asset
        uses: actions/upload-release-asset@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          upload_url: ${{ github.event.release.upload_url }}
          asset_path: ${{ steps.deploy.outputs.zip-path }}
          asset_name: ${{ github.event.repository.name }}.zip
          asset_content_type: application/zip
```

### Option C: Deploy with a build step

```yaml
name: Deploy to WordPress.org

on:
  push:
    tags:
      - '*'

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Build
        run: |
          npm ci
          npm run build

      - name: Deploy to WordPress.org
        uses: 10up/action-wordpress-plugin-deploy@stable
        with:
          build_dir: build
        env:
          SVN_USERNAME: ${{ secrets.SVN_USERNAME }}
          SVN_PASSWORD: ${{ secrets.SVN_PASSWORD }}
```

### Deploy configuration

| Setting | Default | What it does |
|---|---|---|
| `generate-zip` | `false` | Create a ZIP file of the deployed plugin |
| `dry-run` | `false` | Skip the final SVN commit (for testing) |
| `build_dir` | (empty) | Deploy from this directory instead of repo root |

### Required secrets

These must be set in the repository's Settings > Secrets and variables > Actions:

- **`SVN_USERNAME`** — WordPress.org username
- **`SVN_PASSWORD`** — WordPress.org password (Application Password recommended)

### How the deploy works

- The action takes the tagged version from Git and commits it to the WordPress.org SVN repository
- It automatically strips a `v` prefix from tags (so `v1.2.3` becomes `1.2.3` on WordPress.org)
- Files listed in `.distignore` (or marked `export-ignore` in `.gitattributes`) are excluded
- Contents of the `.wordpress-org` directory are moved to the SVN `assets/` folder (plugin banner, icon, screenshots)

---

## 10. Supporting Config Files

### .distignore

Controls which files are excluded from the WordPress.org deployment. Place in the repo root.

```text
# Directories
/.wordpress-org
/.git
/.github
/node_modules
/tests
/src
/vendor

# Files
.distignore
.editorconfig
.eslintrc
.gitattributes
.gitignore
.phpcs.xml.dist
.stylelintrc
composer.json
composer.lock
package.json
package-lock.json
phpstan.neon.dist
phpunit.xml.dist
webpack.config.js
```

Adapt this list to the specific plugin. The idea is to ship only what the end user needs — no dev tooling, no tests, no build configs.

### phpcs.xml.dist

Custom PHPCS configuration. Use this when the plugin needs to exclude specific rules or target specific directories.

```xml
<?xml version="1.0"?>
<ruleset name="Plugin Rules">
    <description>Custom ruleset for the plugin.</description>

    <!-- What to scan -->
    <file>.</file>

    <!-- Exclude paths -->
    <exclude-pattern>/vendor/*</exclude-pattern>
    <exclude-pattern>/node_modules/*</exclude-pattern>
    <exclude-pattern>/tests/*</exclude-pattern>
    <exclude-pattern>/build/*</exclude-pattern>

    <!-- Use the WordPress standard -->
    <rule ref="WordPress">
        <!-- Exclude rules that don't fit the project -->
        <exclude name="WordPress.Files.FileName.NotHyphenatedLowercase" />
        <exclude name="WordPress.Files.FileName.InvalidClassFileName" />
    </rule>

    <!-- Set minimum supported WordPress version -->
    <config name="minimum_wp_version" value="6.0" />

    <!-- Check for cross-version support for PHP 7.4+ -->
    <config name="testVersion" value="7.4-" />
</ruleset>
```

### phpstan.neon.dist

PHPStan configuration for WordPress plugins. Requires the `szepeviktor/phpstan-wordpress` package.

```neon
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon

parameters:
    level: 5
    paths:
        - .
    excludePaths:
        - vendor
        - node_modules
        - tests
    scanDirectories:
        - vendor/szepeviktor/phpstan-wordpress/bootstrap.php
```

### .wordpress-org directory

This directory holds plugin assets for the WordPress.org listing. The deploy action moves its contents to the SVN `assets/` folder automatically.

```text
.wordpress-org/
├── banner-772x250.png      # Plugin banner (standard)
├── banner-1544x500.png     # Plugin banner (retina)
├── icon-128x128.png        # Plugin icon (standard)
├── icon-256x256.png        # Plugin icon (retina)
└── screenshot-1.png        # Screenshots referenced in readme.txt
```
