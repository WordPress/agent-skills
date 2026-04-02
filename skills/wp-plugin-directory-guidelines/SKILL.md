---
name: wp-plugin-directory-guidelines
description: "WordPress.org Plugin Directory submission guidelines reference. Use when reviewing WordPress plugins for GPL compliance, checking license headers, evaluating license compatibility, validating upsells or premium add-ons, verifying plugin directory guideline adherence, or answering questions about WordPress.org plugin policies."
compatibility: "Targets WordPress 6.9+."
---

# WP Plugin Directory Guidelines

## When to use

Use this skill when you need to:
- Review a WordPress plugin for compliance with the WordPress.org Plugin Directory guidelines
- Check GPL license compatibility for a plugin or its bundled libraries
- Verify license headers in plugin files
- Identify common guideline violations before submission
- Answer questions about what is or is not allowed on WordPress.org
- Evaluate premium/upsell flows, license checks, or freemium positioning
- Review "teaser" or "preview" UI for trialware violations

## Inputs required

- Plugin source code (or specific files to review).

## Procedure

1. Check the plugin's license header against the **Valid License Headers** section below.
2. Walk through the **18 Guidelines** checklist, paying special attention to Guidelines 1, 4, 5, 7, 8, and 17 (most common rejection reasons).
3. Confirm trialware/freemium compliance using **Guideline 5: No Trialware** and the **Trialware & Upsell Checks** section below.
4. For any bundled third-party code, verify license compatibility against the **GPL-Compatible Licenses** table.
5. Flag any matches from the **Common GPL Violations** section.
6. For detailed GPL questions, consult the [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html).

## Verification

- Every flagged issue must cite a specific guideline number.
- License compatibility claims must match the GPL-Compatible Licenses table or the [GNU GPL-Compatible License List](https://www.gnu.org/licenses/license-list.html#GPLCompatibleLicenses).
- Do NOT follow local `references/` links; they do not exist. Use the external URLs provided.

## Failure modes

- If a license is not listed in the compatibility tables, do not guess; check the [GNU license list](https://www.gnu.org/licenses/license-list.html) or escalate.
- If a plugin uses a dual-license model, verify both licenses independently.

---

Source: [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/)

## WordPress.org Plugin Directory Guidelines — Review Checklist

Source: [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/)

Use this section as a structured checklist when reviewing a plugin. Each guideline includes the violation signal to look for, the verdict to issue, and the fix to recommend. Cite the guideline number in every finding.

---

### Guideline 1: GPL-Compatible License

**Check:** Does the main plugin file have a `License:` header with a GPL-compatible value? Are all bundled third-party libraries under compatible licenses?

**Violation signals:**
- Missing `License:` or `License URI:` header in the main plugin file
- License is `Proprietary`, `All Rights Reserved`, `CC-BY-NC`, `CC-BY-ND`, `SSPL`, `BSL`, `Commons Clause`, `EPL`, `EUPL`, or `MPL-1.0`
- Bundled library under a license not in the GPL-Compatible Licenses table (see below)
- PHP files encoded with ionCube, Zend Guard, or similar — source cannot be exercised → violation

**Verdict:** Flag as **FAIL** with the specific file and license value found.

**Fix:** Use `GPL-2.0-or-later` (recommended). Add full license text or a `License URI:` to `https://www.gnu.org/licenses/gpl-2.0.html`. Replace incompatible libraries.

---

### Guideline 2: Developer Responsibility

**Check:** Has the developer deliberately re-introduced previously removed code, circumvented a prior guideline decision, or included files they cannot legally distribute?

**Violation signals:**
- Commit history shows restoring a file after it was removed by the review team
- Bundled assets with no documented license (treat as unlicensed until proven otherwise)
- Third-party API terms prohibit redistribution of the bundled SDK

**Verdict:** Flag as **FAIL**. Document the specific file or commit.

**Fix:** Remove the offending file or obtain and document proper licensing.

---

### Guideline 3: Stable Version in SVN

**Check:** Is the WordPress.org SVN version the canonical release? Is the plugin also distributed via an external channel with a newer version?

**Violation signals:**
- `readme.txt` advertises a version not present in SVN trunk/tags
- External download page (developer's own site) offers a newer build than WP.org
- Plugin auto-updates itself from a non-WP.org server (also a Guideline 8 issue)

**Verdict:** Flag as **FAIL** if an actively maintained external version is ahead of the directory.

**Fix:** Keep SVN up to date. External channels may mirror but must not supersede the directory version.

---

### Guideline 4: Human-Readable Code

**Check:** Is all PHP, JS, and CSS in a form that a developer can read and understand? Are build sources available?

**Violation signals:**
- PHP obfuscated with packer, eval+base64 chains, or variable names like `$a1b2c3` throughout
- Minified JS present **without** any source map or reference to the source repo/file in the readme
- Build artifacts (`.min.js`) committed with no corresponding unminified source in the package or a public repo linked from `readme.txt`

**Verdict:** Flag as **FAIL** for obfuscated PHP (always). Flag minified-only JS as **FAIL** if no source access is documented.

**Fix:** Remove obfuscation. Add a `Development` or `Build` section to `readme.txt` linking to the source repo (GitHub, GitLab, etc.).

---

### Guideline 5: No Trialware

**Core rule:** Every feature shipped in the directory must function end-to-end without a license key, payment, or account.

**Check for each feature gate in the code:**

1. Does a `has_paid_access()` / `is_licensed()` / `check_license()` check gate **local** processing (not an external service call)?
2. Is there a time-based expiry (`time() > $installed_at + 30 * DAY_IN_SECONDS`) for local behavior?
3. Is there a usage quota (`if ( $count >= 100 )`) that is artificially low and only exists to pressure upgrades?
4. Does the free user see a blocked/locked UI that prevents completing a core workflow?

**Violation signals (flag as FAIL):**
- `return` / `wp_die()` / blocking screen shown when `has_paid_access()` is false for a local feature
- Ternary limits: `$limit = $licensed ? 10000 : 100` with no filter to extend the free cap
- Features expire after X days even when no external service is involved
- Admin screen is entirely replaced with an upgrade prompt

**Allowed patterns (do not flag):**
- Upsell notice shown alongside a working free feature (non-blocking)
- Premium feature delegated to a **separate** add-on plugin not hosted on WP.org
- External SaaS feature gated because the **service** itself requires payment (e.g., AI API quota)
- Dismissible comparison table or upgrade button in plugin settings

**Code patterns:**

```php
// VIOLATION — local feature blocked by paid check
if ( ! $this->has_paid_access() ) {
    echo 'Upgrade required';
    return; // ← blocks execution
}

// VIOLATION — artificial cap with no extension point
$limit = $this->has_paid_access() ? 10000 : 100;
```

```php
// COMPLIANT — free path works; premium adds to it
$this->render_basic_export();
if ( $this->has_premium_addon() ) {
    do_action( 'myplugin_premium_export_options' );
}

// COMPLIANT — cap is consistent; extensible via filter
$limit = apply_filters( 'myplugin_event_limit', 10000 );
```

**Pre-submission checklist:**
- [ ] All free features work without a license key
- [ ] No time-based expirations or usage quotas for local behavior
- [ ] No blocking/locked UI preventing free-tier workflows
- [ ] Upsell prompts are informational, non-blocking, and dismissible
- [ ] Premium-only code lives in a separate add-on or an external service

---

### Guideline 6: SaaS Integrations Are Allowed — With Conditions

**Check:** Does the external service provide real functionality? Is it documented in the readme?

**Violation signals:**
- The external service's sole purpose is validating a license key; all actual processing is local
- Code was moved server-side specifically to disguise what is really a local feature gate
- Plugin is a storefront or checkout page for an external product with no real plugin functionality

**Verdict:** Flag as **FAIL** for license-validation-only services. Do not flag genuine SaaS integrations.

**Fix:** Document what the external service does in `readme.txt`. Move license validation out of the plugin's critical path if the functionality is local.

---

### Guideline 7: No External Data Collection Without Consent

**Check:** Does the plugin send any data to an external server without the user explicitly opting in?

**Violation signals:**
- HTTP request to a remote URL on plugin activation, admin page load, or cron job with no user opt-in
- User email, site URL, or usage data sent without a visible opt-in checkbox or registration step
- Third-party analytics or ad-tracking scripts loaded in admin or frontend without consent
- Assets (images, fonts, scripts) loaded from an external CDN that are not the plugin's primary service

**Exception:** Plugins that are interfaces to a named third-party service (e.g., Akismet, Mailchimp, a CDN) — consent is implied when the user configures the service connection.

**Verdict:** Flag as **FAIL** for any unconsented outbound call. Include the specific URL or domain found.

**Fix:** Wrap all outbound calls in an opt-in gate. Add a `Privacy Policy` section to `readme.txt` describing what data is collected and why.

---

### Guideline 8: No Remotely Loaded Executable Code

**Check:** Is all JS/CSS that runs on the user's site included in the plugin package?

**Violation signals:**
- `wp_enqueue_script()` loading JS from a third-party CDN (not a self-hosted asset)
- Plugin fetches and executes code from an external URL at runtime (`file_get_contents` + `eval`, dynamic `<script src>`)
- Plugin installs or updates itself from a non-WP.org server
- Admin page rendered entirely inside an `<iframe>` pointing to an external URL

**Exceptions allowed:**
- Web fonts loaded from Google Fonts or similar font CDNs
- The plugin's own SaaS service loading its own widget/embed scripts (with user consent per Guideline 7)

**Verdict:** Flag as **FAIL** for each externally loaded executable. Note the URL and the file/line where it is enqueued.

**Fix:** Bundle JS/CSS locally. Use the WP.org SVN for updates. Replace `<iframe>` admin pages with proper WP Admin UI backed by a REST or admin-ajax API.

---

### Guideline 9: No Illegal, Dishonest, or Offensive Behavior

**Check:** Does the plugin engage in any deceptive, manipulative, or harmful behavior?

**Violation signals:**
- Hidden keyword stuffing in page output to manipulate search rankings
- Code that posts reviews, ratings, or support replies on the user's behalf
- Plugin presented as original work but is a fork or copy of another plugin without attribution
- Plugin claims to make a site “GDPR compliant” or “ADA compliant” without legal basis
- Code that uses site visitor resources for crypto-mining, botnets, or similar

**Verdict:** Flag as **FAIL**. This is a high-severity category; document evidence thoroughly.

---

### Guideline 10: No Forced External Links

**Check:** Does the plugin output any “Powered by” links, footer credits, or backlinks visible to site visitors?

**Violation signals:**
- Credit link output by default with no setting to disable it
- Plugin requires the credit link to remain active for full functionality
- Link is embedded in non-optional template output

**Exception:** A service may brand its own rendered output (e.g., a payment form branded with the payment processor's logo).

**Verdict:** Flag as **FAIL** if the link is on by default with no opt-out. Flag as **FAIL** if removing it breaks functionality.

**Fix:** Default the setting to `false` (hidden). Provide a clear checkbox in settings to enable it.

---

### Guideline 11: No Admin Dashboard Hijacking

**Check:** Are admin notices, upgrade prompts, and nags limited and non-intrusive?

**Violation signals:**
- Site-wide admin notice that cannot be dismissed (no dismiss button, reappears on every page load)
- Upgrade/upsell prompt shown on every admin page, not just the plugin's own settings screen
- Plugin overrides the WordPress dashboard home page or injects full-page overlays
- Ad banners or tracking pixels placed in the WordPress admin area

**Verdict:** Flag as **FAIL** for persistent undismissable notices or for notices appearing outside the plugin's own pages.

**Fix:** Use `is_plugin_page()` or an equivalent check to scope notices. Add a dismiss handler using `update_user_meta` or the WP dismissible notice pattern. Never show upgrade prompts on unrelated admin pages.

---

### Guideline 12: No Readme Spam

**Check:** Is the `readme.txt` free of keyword stuffing, excessive affiliate links, and competitor tags?

**Violation signals:**
- More than 5 tags in the `Tags:` field
- Affiliate links present but not disclosed, or using redirect/cloaking URLs
- Tags that name competitor plugins or irrelevant popular terms purely for SEO
- `readme.txt` reads as a keyword list rather than useful documentation

**Verdict:** Flag as **WARNING** for minor stuffing; **FAIL** for undisclosed affiliate links or more than 5 tags.

**Fix:** Reduce tags to 5 or fewer relevant terms. Disclose all affiliate links with “(affiliate link)” notation. Link affiliate URLs directly without cloaking.

---

### Guideline 13: Use WordPress-Bundled Libraries

**Check:** Does the plugin bundle its own copies of libraries that WordPress already ships?

**Violation signals:**
- Plugin includes its own `jquery.js`, `jquery.min.js`, or loads jQuery from a CDN
- Plugin bundles `PHPMailer`, `SimplePie`, `PHPass`, `Backbone`, `Underscore`, `React`, `wp-polyfill`, or other WP-bundled libraries
- `wp_enqueue_script()` registers a library already available as a WordPress handle (check [Default Scripts](https://developer.wordpress.org/reference/functions/wp_enqueue_script/))

**Verdict:** Flag as **FAIL** for each duplicate bundled library.

**Fix:** Replace bundled copies with `wp_enqueue_script( 'jquery' )` (or the appropriate WP handle). Remove the local copy from the plugin package.

---

### Guideline 14: SVN Is a Release Repository

**Check:** Are SVN commits release-quality and infrequent?

**Violation signals:**
- Multiple commits per day with messages like “fix typo”, “testing”, “debug”
- Development/debug code committed to trunk (e.g., `var_dump()`, `error_log()`, `console.log( 'test' )`)
- Version number not incremented between commits that change functional code

**Note:** This guideline is primarily advisory; violations do not block submission but reflect poorly on the developer.

**Fix:** Use a development branch (GitHub/GitLab) and commit to SVN only for releases. Each SVN commit should correspond to a version bump.

---

### Guideline 15: Increment Version Numbers

**Check:** Is the version number in `readme.txt` and the plugin header incremented for every release?

**Violation signals:**
- `Stable tag:` in `readme.txt` does not match the `Version:` field in the main plugin file
- `Stable tag: trunk` used (discouraged; use an explicit version number)
- Version number is the same across two different functional releases in SVN tags

**Verdict:** Flag as **FAIL** if `Stable tag` and plugin header `Version` do not match.

**Fix:** Bump both values together on every release. Tag the release in SVN under `tags/X.Y.Z`.

---

### Guideline 16: Plugin Must Be Complete at Submission

**Check:** Is the plugin functional and complete at the time of submission?

**Violation signals:**
- Plugin is a skeleton with placeholder functions or “coming soon” admin pages
- Slug was requested to reserve a name for a future or in-progress product
- Primary plugin functionality requires a separate plugin not yet published

**Verdict:** Flag as **FAIL**. An incomplete plugin cannot be approved.

**Fix:** Submit only when the plugin is feature-complete and functional for end users.

---

### Guideline 17: Respect Trademarks and Copyrights

**Check:** Does the plugin name or slug start with a trademark or project name the developer does not own?

**Violation signals:**
- Slug starts with `woocommerce-`, `elementor-`, `jetpack-`, `yoast-`, or any term in the Trademark Slug List (see Naming Rules section below)
- Plugin name starts with a trademarked term (e.g., “WooCommerce Pricing Rates” → starts with WooCommerce)
- Name uses a portmanteau of a trademark (e.g., “PricingPress” uses `-Press` from WordPress)

**Correct pattern:** Trademark may only appear **after** a connector word: `for`, `with`, `using`, `and`.
- ✅ `Pricing Rates for WooCommerce`
- ❌ `WooCommerce Pricing Rates`

**Verdict:** Flag as **FAIL** with the specific trademark and the correct name structure.

**Fix:** Move the trademark to after a connector. Rename the slug accordingly (max 50 chars, lowercase, hyphens only).

---

### Guideline 18: WordPress.org Reserves Directory Rights

**Note:** This guideline is informational — no code or readme check is required. It establishes that WordPress.org may update guidelines, remove plugins, revoke access, or modify plugins for public safety at any time. Inform developers of this when advising on submission strategy.

---

## GPL Compliance (Guideline 1 in Detail)

### Quick Reference: WordPress GPL Requirements

WordPress is licensed under **GPLv2 or later**. All plugins distributed via WordPress.org must be:

1. **100% GPL-compatible** (code, images, CSS, and all assets)
2. Include a **license declaration** in the main plugin file header
3. Include the **full license text** or a URI reference to it
4. **Not restrict freedoms** granted by the GPL

## GPL Versions Summary

| Version | Year | Key Addition |
|---------|------|--------------|
| GPLv1 | 1989 | Base copyleft: share-alike for modifications |
| GPLv2 | 1991 | Patent clause (Section 7), clearer distribution terms |
| GPLv3 | 2007 | Anti-tivoization, explicit patent grants, compatibility provisions |

WordPress uses **GPLv2 or later**, meaning plugins can use GPLv2, GPLv3, or "GPLv2 or later".

For full license texts, see:
- [GNU General Public License v1](https://www.gnu.org/licenses/gpl-1.0.html)
- [GNU General Public License v2](https://www.gnu.org/licenses/gpl-2.0.html)
- [GNU General Public License v3](https://www.gnu.org/licenses/gpl-3.0.html)

## License Compliance Checklist

When reviewing a plugin, verify:

- [ ] Main plugin file has a valid `License:` header (e.g., `GPL-2.0-or-later`, `GPL-2.0+`, `GPLv2 or later`)
- [ ] Main plugin file has a `License URI:` header pointing to the GPL text
- [ ] If bundled libraries exist, each has a GPL-compatible license
- [ ] No "split licensing" (e.g., code GPL but premium features proprietary)
- [ ] No additional restrictions beyond what GPL allows
- [ ] No clauses restricting commercial use, modification, or redistribution
- [ ] No obfuscated code (violates the spirit of source code availability)

## Valid License Headers for WordPress Plugins

```
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
```

```
License: GPL-3.0-or-later
License URI: https://www.gnu.org/licenses/gpl-3.0.html
```

```
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
```

## Accepted Licenses by the WordPress.org Plugin Directory

Source: [Plugin Check - License_Utils trait](https://github.com/WordPress/plugin-check/blob/trunk/includes/Traits/License_Utils.php)

The Plugin Directory accepts licenses matching these identifiers (after normalization). The validation uses `is_license_gpl_compatible()` with the pattern:

```
GPL|GNU|LGPL|MIT|FreeBSD|New BSD|BSD-3-Clause|BSD 3 Clause|OpenLDAP|Expat|Apache2|MPL20|ISC|CC0|Unlicense|WTFPL|Artistic|Boost|NCSA|ZLib|X11
```

### GPL Family (recommended)

| Accepted Values | SPDX Identifier | License URI |
|-----------------|-----------------|-------------|
| `GPL-2.0-or-later`, `GPLv2 or later`, `GPL-2.0+` | GPL-2.0-or-later | https://www.gnu.org/licenses/gpl-2.0.html |
| `GPL-2.0-only`, `GPLv2` | GPL-2.0-only | https://www.gnu.org/licenses/gpl-2.0.html |
| `GPL-3.0-or-later`, `GPLv3 or later`, `GPL-3.0+` | GPL-3.0-or-later | https://www.gnu.org/licenses/gpl-3.0.html |
| `GPL-3.0-only`, `GPLv3` | GPL-3.0-only | https://www.gnu.org/licenses/gpl-3.0.html |
| `GNU General Public License` (any version text) | — | — |
| `LGPL-2.1`, `LGPLv2.1` | LGPL-2.1-or-later | https://www.gnu.org/licenses/lgpl-2.1.html |
| `LGPL-3.0`, `LGPLv3` | LGPL-3.0-or-later | https://www.gnu.org/licenses/lgpl-3.0.html |

### Other GPL-Compatible Licenses Accepted

| Identifier | License Name | Notes |
|------------|-------------|-------|
| `MIT` | MIT License | Permissive, compatible with GPLv2 and GPLv3 |
| `Expat` | Expat License | Functionally equivalent to MIT |
| `X11` | X11 License | Permissive; similar to Expat but with extra X Consortium clause |
| `FreeBSD` | BSD 2-Clause (FreeBSD) | Permissive, compatible with GPLv2 and GPLv3 |
| `New BSD`, `BSD-3-Clause`, `BSD 3 Clause` | BSD 3-Clause | Permissive, compatible with GPLv2 and GPLv3 |
| `Apache2`, `Apache-2.0` | Apache License 2.0 | Compatible with GPLv3 only (NOT GPLv2) |
| `MPL20`, `MPL-2.0` | Mozilla Public License 2.0 | Compatible via Section 3.3 |
| `ISC` | ISC License | Permissive, compatible with GPLv2 and GPLv3 |
| `OpenLDAP` | OpenLDAP Public License v2.7 | Permissive; older v2.3 is NOT compatible |
| `CC0` | Creative Commons Zero | Public domain dedication |
| `Unlicense` | The Unlicense | Public domain dedication |
| `WTFPL` | Do What The F*** You Want To Public License | Permissive, accepted in full text form too |
| `Artistic` | Artistic License 2.0 | Compatible via relicensing option in §4(c)(ii); Artistic 1.0 is NOT compatible |
| `Boost` | Boost Software License 1.0 | Lax permissive, compatible with GPLv2 and GPLv3 |
| `NCSA` | NCSA/University of Illinois Open Source License | Based on Expat + modified BSD; compatible with GPLv2 and GPLv3 |
| `ZLib` | zlib License | Permissive, compatible with GPLv2 and GPLv3 |

### Licenses NOT Accepted

Any license not matching the identifiers above will be rejected. Common rejections include:

- **Proprietary / All Rights Reserved**
- **Creative Commons BY-NC** (NonCommercial restriction)
- **Creative Commons BY-ND** (NoDerivatives restriction)
- **Creative Commons BY-SA** (v3.0 and earlier; v4.0 is one-way compatible with GPLv3 but not in the Plugin Check regex)
- **JSON License** ("shall be used for Good, not Evil")
- **SSPL** (Server Side Public License)
- **BSL** (Business Source License)
- **Commons Clause**
- **Elastic License**
- **Original BSD (4-clause)** — advertising clause incompatible with GPL
- **MPL-1.0** — only MPL 2.0 is GPL-compatible
- **EPL** (Eclipse Public License) — weak copyleft, incompatible with GPL
- **EUPL** (European Union Public License) — copyleft incompatible with GPL without multi-step relicensing
- **Artistic License 1.0** — vague wording makes it incompatible; use 2.0 instead
- **OpenLDAP v2.3** (old) — incompatible; v2.7 is accepted

## Common GPL Violations in Plugin Review

### 1. Split Licensing
Plugin claims GPL but restricts premium features:
- "Free version is GPL, premium is proprietary" - **VIOLATION**
- All code distributed must be GPL-compatible

### 2. Obfuscated Code
- Minified JavaScript is acceptable IF source is provided
- PHP obfuscation (ionCube, Zend Guard, etc.) - **VIOLATION** (prevents exercise of GPL freedoms)
- Encoded/encrypted PHP - **VIOLATION**

### 3. Missing License Information
- No license header in main file
- No license file in the package
- Bundled libraries without license documentation

### 4. Restrictive Clauses
- "You may not sell this plugin" - **VIOLATION** (GPL allows commercial redistribution)
- "You may not remove author credits" - Acceptable under GPLv3 Section 7(b), but not as blanket restriction
- "For personal use only" - **VIOLATION**
- "You must link back to our site" - **VIOLATION** (additional restriction)

### 5. Incompatible Library Inclusion
- Including code under GPL-incompatible licenses
- Using assets (images, fonts, CSS) under restrictive licenses

## Key GPL Concepts for Reviewers

### Distribution vs. Private Use
- GPL obligations activate upon **distribution** (conveying to others)
- Private modifications do NOT trigger GPL requirements
- Publishing on WordPress.org IS distribution

### Derivative Works
- A WordPress plugin that uses WordPress APIs is generally considered a derivative work
- Plugins that merely aggregate with WordPress may have different considerations
- When in doubt, the safe approach is GPL-compatible licensing

### Source Code Requirement
- GPL requires access to "complete corresponding source code"
- For WordPress plugins: all PHP, JS source files, build scripts
- Minified files must have corresponding source available

### The "Or Later" Clause
- "GPLv2 or later" allows users to choose GPLv2 OR any later version
- "GPLv2 only" means strictly GPLv2 (less flexible but valid)
- WordPress itself uses "GPLv2 or later"

## Violation Reporting Workflow

When a GPL violation is identified:

1. **Document the violation** precisely:
   - Product name and version
   - Distributor information
   - Specific license terms violated
   - Evidence (screenshots, code snippets)

2. **Contact the copyright holder** first
3. **Report to FSF** if the code is FSF-copyrighted: license-violation@gnu.org
4. **For WordPress.org plugins**: flag through the plugin review process

For detailed violation handling procedures, see the [FSF License Violation page](https://www.gnu.org/licenses/gpl-violation.html).

## Frequently Asked Questions

For comprehensive GPL FAQ answers, see the [GNU GPL FAQ](https://www.gnu.org/licenses/gpl-faq.html).

Common questions during plugin review:

**Can a plugin charge money and still be GPL?**
Yes. GPL allows charging for distribution. The requirement is that recipients get GPL freedoms (use, modify, redistribute).

**Does a plugin need to include the full GPL text?**
GPLv2 Section 1 and GPLv3 Section 4 require giving recipients a copy of the license. A URI reference in the header plus including a LICENSE file is standard practice.

**Can a plugin restrict who uses it?**
No. GPL explicitly prohibits additional restrictions on recipients. "For personal use only" or "non-commercial" clauses are incompatible.

**Is minified JS without source a violation?**
If the plugin only distributes minified JS without any way to obtain the source, this conflicts with GPL's source code requirements. The source should be available (in the package or via a repository).

**Can a plugin use CC-BY-SA images?**
CC-BY-SA 4.0 is one-way compatible with GPLv3 (CC-BY-SA material can be included in GPLv3 works). CC-BY-SA 3.0 is NOT compatible.

**What about fonts bundled in plugins?**
Fonts must be under GPL-compatible licenses. Common acceptable font licenses: OFL (SIL Open Font License), Apache 2.0 (with GPLv3), MIT, GPL with font exception.

---

## Plugin Naming Rules (Guideline 17 + Plugin Check Namer)

Sources: [Plugin Header Requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/#header-fields) · [Detailed Plugin Guidelines §17](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/) · Plugin Check `Plugin_Header_Fields_Check`, `Trademarks_Check`, and AI Namer prompts.

### Technical Name Requirements

| Rule | Details | Error Code |
|------|---------|------------|
| Must not use placeholder names | `"Plugin Name"` or `"My Basics Plugin"` are rejected | `plugin_header_invalid_plugin_name` |
| Minimum 5 alphanumeric characters | Name must contain at least 5 latin letters (a–Z) or digits | `plugin_header_unsupported_plugin_name` (new plugins only) |
| Name must exist in readme | `=== Plugin Name ===` header required and must be valid | `invalid_plugin_name` / `empty_plugin_name` |
| Name must match across files | Readme and plugin header name must match (case/entity-decoded) | `mismatched_plugin_name` (warning) |

**Slug rules:** lowercase, hyphens only, max 50 characters, derived from display name.

### Naming Quality Rules (AI Namer)

**1. No generic names**
Names must be specific enough to distinguish the plugin from ~60,000 others.
- Rejected: "Shipping", "Ecommerce Tracker", "SEO Plugin"
- Accepted: "ShipGlex Shipping", "Shipping Tracker for UPS"
- Exception: invented/original terms are allowed if placed at the **beginning** of the name

**2. Name must relate to plugin function**
The display name must correlate with what the plugin actually does. Exception: original invented terms.

**3. No keyword stuffing**
Unnaturally repeating keywords in the name for SEO purposes is not allowed.

**4. No names too similar to existing plugins**
Checked against the WordPress.org Plugin Directory. If similar, suggest a distinctive term (author name, brand, or crafted term) at the beginning.

**5. Trademark/project name usage rules**
Trademarks and project names are allowed **only** after connectors like `for`, `with`, `using`, or `and`:
- ✅ `"My Plugin for WooCommerce"` — trademark after "for", no affiliation implied
- ✅ `"Pricing Rates for WooCommerce"` — OK
- ❌ `"WooCommerce Pricing Rates"` — starts with trademark, implies affiliation
- ❌ `"Nicedev Paypal for WooCommerce"` — PayPal is not after a no-affiliation structure; correct form: `"Nicedev Payment Gateway with PayPal for WooCommerce"`
- ❌ `"PricingPress"` — portmanteau using `-Press` (WordPress trademark)
- Check for portmanteaus: names blending a trademark (e.g., `-Press`, `Woo-`) are not allowed

**6. Banned and discouraged terms**

Banned/discouraged terms cannot appear **anywhere** in the name — not even after `for`/`with`.

#### Banned Terms (hard block)

| Term | Reason |
|------|--------|
| Facebook, FB, fbook, Whatsapp, WA, Instagram, Insta, Gram, INS, Threads, Oculus | Meta legal request: no use in name, slug, or banners |
| WordPress, wordpess, wpress | WordPress trademark; redundant in the WP.org directory |
| WP (as standalone/redundant, e.g., "for WP") | Same as WordPress — redundant in context |
| Trustpilot | Direct request from trademark holder |
| Binance Pay | Direct request from trademark holder |

#### Discouraged Terms (must be removed)

| Term | Reason |
|------|--------|
| plugin (when redundant, e.g., "SEO Plugin") | Redundant; forbidden as first word |
| best, #1, First, Perfect, The most | Superlatives / unverifiable comparative claims |
| free (when redundant, e.g., "(free)") | All directory plugins are free — redundant |
| WP, W P (at beginning or end, referring to WordPress) | WordPress abbreviation — redundant |
| Gutenberg, gberg, guten, berg | Creates confusion; block editor is the current name |

### Trademark Slug List (static check — `Trademarks_Check`)

The following slugs are statically blocked. Terms ending in `-` cannot **begin** a slug; terms without `-` cannot appear **anywhere** in the slug. `woocommerce` (no dash) is allowed only as `for-woocommerce`, `with-woocommerce`, `using-woocommerce`, or `and-woocommerce`.

```
adobe-, adsense-, advanced-custom-fields-, adwords-, akismet-,
all-in-one-wp-migration, amazon-, android-, apple-, applenews-, applepay-,
aws-, azon-, bbpress-, bing-, booking-com, bootstrap-, buddypress-,
chatgpt-, chat-gpt-, cloudflare-, contact-form-7-, cpanel-, disqus-, divi-,
dropbox-, easy-digital-downloads-, elementor-, envato-,
fbook, facebook, fb-, fb-messenger, fedex-, feedburner, firefox-,
fontawesome-, font-awesome-, ganalytics-, gberg, github-, givewp-, google-,
googlebot-, googles-, gravity-form-, gravity-forms-, gravityforms-, gtmetrix-,
gutenberg, guten-, hubspot-, ig-, insta-, instagram, internet-explorer-,
ios-, jetpack-, macintosh-, macos-, mailchimp-, microsoft-,
ninja-forms-, oculus, onlyfans-, only-fans-, opera-, paddle-, paypal-,
pinterest-, plugin, skype-, stripe-, tiktok-, tik-tok-, trustpilot,
twitch-, twitter-, tweet, ups-, usps-, vvhatsapp, vvcommerce, vva-, vvoo,
wa-, webpush-vn, wh4tsapps, whatsapp, whats-app, watson, windows-,
wocommerce, woocom-, woocommerce, woocomerce, woo-commerce, woo-, wo-,
wordpress, wordpess, wpress, wp, wc, wp-mail-smtp-, yandex-, yahoo-,
yoast, youtube-, you-tube-
```

**Portmanteaus also blocked:** any slug starting with `woo` (case-insensitive) — e.g., `woopress`, `wooland`.

### Naming Examples

| Plugin Name | Verdict | Reason |
|-------------|---------|--------|
| `Shipping` | ❌ | Too generic |
| `Ecommerce Tracker` | ❌ | Too generic, no context |
| `Shipping Tracker for UPS` | ✅ | Descriptive + context |
| `ShipGlex Shipping` | ✅ | Invented term at beginning |
| `WooCommerce Pricing Rates` | ❌ | Starts with trademark |
| `Pricing Rates for WooCommerce` | ✅ | Trademark after "for" |
| `PricingPress` | ❌ | `-Press` portmanteau |
| `PRT Text editor for WP` | ❌ | WP is banned/redundant; correct: `PRT Text editor` |
| `Nicedev Paypal for WooCommerce` | ❌ | PayPal not after no-affiliation structure |
| `Nicedev Payment Gateway with PayPal for WooCommerce` | ✅ | Correct structure |
| `Best SEO Plugin for WordPress` | ❌ | Superlative + banned terms |
| `My Free Slider` | ❌ | "free" is redundant/discouraged |

### Naming Review Checklist (pre-submission)

- [ ] Name is not a placeholder (`Plugin Name`, `My Basics Plugin`)
- [ ] Name has at least 5 alphanumeric characters
- [ ] Name matches between plugin header and readme
- [ ] Name is specific — not too generic for 60,000+ plugins
- [ ] Name relates to what the plugin actually does
- [ ] No keyword stuffing
- [ ] No banned terms anywhere (Meta brands, WordPress/WP redundant, Trustpilot, Binance Pay)
- [ ] No discouraged terms (Plugin, Best/#1, Free, Gutenberg, standalone WP)
- [ ] Trademarks/project names only appear after `for`/`with`/`using`/`and`
- [ ] No portmanteaus using WordPress or WooCommerce trademarks
- [ ] Slug is lowercase, hyphens only, max 50 chars, no blocked terms
