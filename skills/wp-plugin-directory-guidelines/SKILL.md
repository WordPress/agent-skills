---
name: wp-plugin-directory-guidelines
description: "WordPress.org Plugin Directory guidelines reference including GPL licensing compliance, trialware/freemium compliance, and the 18 Detailed Plugin Guidelines. Use when reviewing WordPress plugins for GPL compliance, checking license headers, evaluating license compatibility, validating upsells or premium add-ons, verifying plugin directory guideline adherence, or answering questions about WordPress.org plugin policies."
compatibility: "Targets WordPress 5.0+ (PHP 7.2.24+). Reference-only skill, no runtime dependencies."
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
- Review “teaser” or “preview” UI for trialware violations

## Inputs required

- Plugin source code (or specific files to review).

## Procedure

1. Check the plugin's license header against the **Valid License Headers** section below.
2. Walk through the **18 Guidelines** checklist, paying special attention to Guidelines 1, 4, 5, 7, 8, and 17 (most common rejection reasons).
3. Confirm trialware/freemium compliance using **Guideline 5: No Trialware** and the **Trialware & Upsell Checks** section below.
4. For any bundled third-party code, verify license compatibility against the **GPL-Compatible Licenses** table.
5. Flag any matches from the **Common GPL Violations** section.
6. For detailed GPL questions, consult [GPL License FAQ](references/gpl-license-faq.md).

## Verification

- Every flagged issue must cite a specific guideline number.
- License compatibility claims must match the GPL-Compatible Licenses table or the [GNU GPL-Compatible License List](https://www.gnu.org/licenses/license-list.html#GPLCompatibleLicenses).

## Failure modes

- If a license is not listed in the compatibility tables, do not guess; check the [GNU license list](https://www.gnu.org/licenses/license-list.html) or escalate.
- If a plugin uses a dual-license model, verify both licenses independently.

---

Source: [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/)

## WordPress.org Plugin Directory Guidelines (18 Rules)

All plugins hosted on WordPress.org must comply with these guidelines. Violations may result in plugin removal.

### Guideline 1: GPL-Compatible License
All code, data, images, and third-party libraries must comply with the GPL or a GPL-compatible license. Using "GPLv2 or later" (same as WordPress) is strongly recommended. See the GPL Compliance section below for details.

### Guideline 2: Developer Responsibility
Developers are solely responsible for ensuring all files comply with guidelines. Intentionally circumventing guidelines or restoring removed code is prohibited. Developers must verify licensing of all included files and comply with terms of third-party services/APIs.

### Guideline 3: Stable Version Available
The only distributed version is the one in the WordPress.org directory. Code must be kept up to date in SVN; distributing via alternate methods while neglecting the directory version may result in removal.

### Guideline 4: Human-Readable Code
Code obfuscation is prohibited (packer, uglify mangle, unclear naming like `$z12sdf813d`). Developers must provide public access to source code and build tools either:
- Included in the deployed plugin, OR
- Via a link in the readme to the development location

### Guideline 5: No Trialware
Plugins may not contain functionality restricted/locked behind payment or upgrade. No disabling after trial period or quota. No sandbox-only API access. Paid functionality in external services IS permitted if all plugin code is fully available. Add-on plugins hosted outside WordPress.org are recommended for premium code.

#### Trialware & Upsell Checks (Guideline 5 Focus)

**Core rule:** Anything shipped on WordPress.org must work fully without a license key or payment.

**Not allowed (trialware patterns):**
- Time-based or usage-based cutoffs for local features
- “Free but crippled” behavior intended to force upgrades
- License key checks to unlock local-only functionality
- Artificial quotas for features that would otherwise work locally

**Allowed (freemium patterns):**
- Informational upsell UI that does not block use
- Premium functionality provided by a separate add-on plugin
- External SaaS integrations where the service itself provides the value
- Preview/teaser UI that is clearly non-blocking and optional

**Pattern guidance (keep free functional):**

```php
// Bad: blocks local feature
if ( ! $this->has_paid_access() ) {
    echo 'Upgrade required';
    return;
}
```

```php
// Good: free feature works, premium enhances
$this->render_basic_export();
if ( $this->has_premium_addon() ) {
    do_action( 'myplugin_premium_export_options' );
}
```

```php
// Bad: artificial limit
$limit = $this->has_paid_access() ? 10000 : 100;
```

```php
// Good: consistent limit, allow extension via add-on/filter
$limit = 10000;
$limit = apply_filters( 'myplugin_event_limit', $limit );
```

**Upsell UI principles:**
- Keep upsells contextual and dismissible
- Avoid blocking screens or repeated nags
- Use comparison tables or subtle notices instead of hard gates
- If you show a disabled preview UI for a premium feature, make sure it never prevents the free feature from working

**Review questions (ask per feature):**
1. Does this feature run end-to-end without a license key?
2. Is any code path gated solely by “paid” checks for local behavior?
3. Are there time/usage caps that reduce free functionality?
4. Would a free user feel blocked or tricked?
5. Does the free version still provide standalone value?

**Trialware compliance checklist (pre-submission):**
- [ ] All free features work without a license key
- [ ] No time-based expirations or usage quotas
- [ ] No “locked” UI that blocks normal use
- [ ] Upsell prompts are informational and dismissible
- [ ] Premium functionality lives in a separate add-on or external service
- [ ] Free version provides real, standalone value

**Common trialware violations:**
- Constant upgrade popups or blocking screens
- Intentionally crippled workflows to force upgrades
- Expiring features after X days
- Usage caps added solely to pressure upgrades
- License validation for features that are purely local

### Guideline 6: SaaS Is Permitted
Plugins acting as interfaces to external third-party services are allowed (even paid). The service must provide real functionality and be documented in the readme. NOT allowed:
- Services that only validate licenses/keys while all functionality is local
- Moving code to a service to falsely appear as supplemented functionality
- Storefronts that are just front-ends for external purchases

### Guideline 7: No User Tracking Without Consent
Plugins may not contact external servers without explicit, authorized consent (opt-in, registration, or checkbox). Privacy policy should be in the readme. Prohibited:
- Automated data collection without user confirmation
- Misleading users into submitting information
- Offloading unrelated assets
- Undocumented use of external data
- Third-party ad tracking

Exception: SaaS plugins (Twitter, CDN, Akismet) where consent is implied by activation/configuration.

### Guideline 8: No External Executable Code
All non-service JS/CSS must be included locally. Prohibited:
- Serving updates from non-WordPress.org servers
- Installing premium versions from external servers
- Third-party CDNs (except font inclusions)
- Managing data lists via third-party services (unless permitted by terms)
- iframes for admin pages (use APIs instead)

### Guideline 9: No Illegal, Dishonest, or Offensive Actions
Includes but not limited to:
- Manipulating search results / keyword stuffing
- Compensating or pressuring for reviews
- Sockpuppeting (fake accounts for reviews/tickets)
- Presenting others' plugins as original work
- Implying plugins create legal compliance
- Using user resources without permission (botnets, crypto-mining)
- Exploiting guideline loopholes

### Guideline 10: No Embedded External Links Without Permission
All "Powered By" or credit links must be optional, defaulting to hidden. Users must opt-in via clear choices. Plugins may not require credits to function. Services may brand their own output.

### Guideline 11: No Admin Dashboard Hijacking
Nags, alerts, and upgrade prompts must be limited and contextual (preferably on the plugin's own settings page). Site-wide notices must be dismissible or self-dismiss. Error messages must explain resolution. Avoid in-dashboard advertising. Tracking referrals via ads is prohibited.

### Guideline 12: No Readme Spam
No unnecessary affiliate links, competitor tags, or keyword stuffing. Maximum 5 tags. Links to required products are permitted in moderation. Readmes are for people, not bots. Affiliate links must be disclosed and link directly (no redirects/cloaking).

### Guideline 13: Use WordPress Default Libraries
Plugins must use WordPress-bundled libraries (jQuery, SimplePie, PHPMailer, PHPass, etc.) instead of bundling their own versions. See [Default Scripts](https://developer.wordpress.org/reference/functions/wp_enqueue_script/) for the full list.

### Guideline 14: Avoid Frequent Commits
SVN is a release repository, not a development one. Every commit triggers zip regeneration. Only deployment-ready code should be pushed. Use descriptive commit messages. Exception: readme updates for WordPress version support.

### Guideline 15: Increment Version Numbers
Version must be incremented for each release. Trunk `readme.txt` must reflect the current version.

### Guideline 16: Complete Plugin at Submission
A complete, functional plugin must be available at submission time. Names cannot be reserved for future use or brand protection. Unused approved slugs may be reassigned.

### Guideline 17: Respect Trademarks and Copyrights
Using trademarks or project names as the sole/initial term of a plugin slug is prohibited unless legal ownership can be confirmed. Example: non-employees should use "Dancing Sloths for SuperSandbox" not "SuperSandbox Dancing Sloths."

### Guideline 18: Directory Maintenance Rights
WordPress.org reserves the right to:
- Update guidelines at any time
- Disable/remove any plugin
- Grant exceptions
- Remove developer access
- Modify plugins for public safety

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
- [GNU General Public License v1](references/gnu-general-public-license-v1.md)
- [GNU General Public License v2](references/gnu-general-public-license-v2.md)
- [GNU General Public License v3](references/gnu-general-public-license-v3.md)

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
GPL|GNU|MIT|FreeBSD|New BSD|BSD-3-Clause|BSD 3 Clause|OpenLDAP|Expat|Apache2|MPL20|ISC|CC0|Unlicense|WTFPL
```

### GPL Family (recommended)

| Accepted Values | SPDX Identifier | License URI |
|-----------------|-----------------|-------------|
| `GPL-2.0-or-later`, `GPLv2 or later`, `GPL-2.0+` | GPL-2.0-or-later | https://www.gnu.org/licenses/gpl-2.0.html |
| `GPL-2.0-only`, `GPLv2` | GPL-2.0-only | https://www.gnu.org/licenses/gpl-2.0.html |
| `GPL-3.0-or-later`, `GPLv3 or later`, `GPL-3.0+` | GPL-3.0-or-later | https://www.gnu.org/licenses/gpl-3.0.html |
| `GPL-3.0-only`, `GPLv3` | GPL-3.0-only | https://www.gnu.org/licenses/gpl-3.0.html |
| `GNU General Public License` (any version text) | — | — |

### Other GPL-Compatible Licenses Accepted

| Identifier | License Name | Notes |
|------------|-------------|-------|
| `MIT` | MIT License | Permissive, compatible with GPLv2 and GPLv3 |
| `FreeBSD` | BSD 2-Clause (FreeBSD) | Permissive, compatible with GPLv2 and GPLv3 |
| `New BSD`, `BSD-3-Clause`, `BSD 3 Clause` | BSD 3-Clause | Permissive, compatible with GPLv2 and GPLv3 |
| `Apache2`, `Apache-2.0` | Apache License 2.0 | Compatible with GPLv3 only (NOT GPLv2) |
| `MPL20`, `MPL-2.0` | Mozilla Public License 2.0 | Compatible via Section 3.3 |
| `ISC` | ISC License | Permissive, compatible with GPLv2 and GPLv3 |
| `Expat` | Expat License | Functionally equivalent to MIT |
| `OpenLDAP` | OpenLDAP Public License | Permissive |
| `CC0` | Creative Commons Zero | Public domain dedication |
| `Unlicense` | The Unlicense | Public domain dedication |
| `WTFPL` | Do What The F*** You Want To Public License | Permissive, accepted in full text form too |

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
- **LGPL** standalone (not matched by current regex; must be combined with GPL)

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

For detailed violation handling procedures, see [GPL Violations](references/gpl-violations.md).

## Frequently Asked Questions

For comprehensive GPL FAQ answers, see [GPL License FAQ](references/gpl-license-faq.md).

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
