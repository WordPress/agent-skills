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

