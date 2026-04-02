## WordPress.org Plugin Directory Guidelines — Review Checklist

Source: [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/?output_format=md)

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
