---
name: wp-plugin-directory-guidelines
description: "Use when reviewing WordPress plugins for GPL compliance, checking license headers or compatibility, evaluating upsell/freemium/trialware patterns, validating plugin naming or trademark rules, checking plugin slugs, understanding why a plugin was rejected from WordPress.org, or answering any question about the 18 WordPress.org Plugin Directory guidelines — even if the user doesn't mention 'guidelines' explicitly."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+)."
---

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

## 18-Guideline Review Checklist

Use the detailed, per-guideline checklist in [guideline-review-checklist.md](references/guideline-review-checklist.md). Load this reference file only when a full guideline audit is requested.

## GPL Compliance (Guideline 1 in Detail)

### Verification (Licensing)

- Every licensing-related issue must cite **Guideline 1** and include the specific file/license value found.
- License compatibility claims must match the GPL-Compatible Licenses table or the [GNU GPL-Compatible License List](https://www.gnu.org/licenses/license-list.html#GPLCompatibleLicenses).
- Use local `references/` files when present; otherwise use authoritative external URLs.

### Failure modes (Licensing)

- If a license is not listed in the compatibility tables, do not guess; check the [GNU license list](https://www.gnu.org/licenses/license-list.html) or escalate.
- If a plugin uses a dual-license model, verify both licenses independently.


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
| GPLv2 | 1991 | "Liberty or death" clause (Section 7), clearer distribution terms |
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
