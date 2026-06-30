# WordPress.org Plugin Directory Guidelines — Review Checklist

Source: [Detailed Plugin Guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/?output_format=md)

Use this section as a structured checklist when reviewing a plugin. Each guideline includes the violation signal to look for, the verdict to issue, and the fix to recommend. Cite the guideline number in every finding.

## Contents

- [WordPress.org Plugin Directory Guidelines — Review Checklist](#wordpressorg-plugin-directory-guidelines--review-checklist)
	- [Contents](#contents)
		- [Guideline 1: GPL-Compatible License](#guideline-1-gpl-compatible-license)
		- [Guideline 2: Developer Responsibility](#guideline-2-developer-responsibility)
		- [Guideline 3: Stable Version in SVN](#guideline-3-stable-version-in-svn)
		- [Guideline 4: Human-Readable Code](#guideline-4-human-readable-code)
		- [Guideline 5: No Trialware](#guideline-5-no-trialware)
		- [Guideline 6: SaaS Integrations Are Allowed — With Conditions](#guideline-6-saas-integrations-are-allowed--with-conditions)
		- [Guideline 7: No External Data Collection Without Consent](#guideline-7-no-external-data-collection-without-consent)
		- [Guideline 8: No Remotely Loaded Executable Code](#guideline-8-no-remotely-loaded-executable-code)
		- [Guideline 9: No Illegal, Dishonest, or Offensive Behavior](#guideline-9-no-illegal-dishonest-or-offensive-behavior)
		- [Guideline 10: No Forced External Links](#guideline-10-no-forced-external-links)
		- [Guideline 11: No Admin Dashboard Hijacking](#guideline-11-no-admin-dashboard-hijacking)
		- [Guideline 12: No Readme Spam](#guideline-12-no-readme-spam)
		- [Guideline 13: Use WordPress-Bundled Libraries](#guideline-13-use-wordpress-bundled-libraries)
		- [Guideline 14: SVN Is a Release Repository](#guideline-14-svn-is-a-release-repository)
		- [Guideline 15: Increment Version Numbers](#guideline-15-increment-version-numbers)
		- [Guideline 16: Plugin Must Be Complete at Submission](#guideline-16-plugin-must-be-complete-at-submission)
		- [Guideline 17: Respect Trademarks and Copyrights](#guideline-17-respect-trademarks-and-copyrights)
		- [Guideline 18: WordPress.org Reserves Directory Rights](#guideline-18-wordpressorg-reserves-directory-rights)

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

**Code patterns (violation vs compliant):**

```php
// VIOLATION — sends data on activation without consent
register_activation_hook( __FILE__, function() {
    wp_remote_post(
        'https://api.example.com/collect',
        array(
            'body' => array(
                'site' => home_url(),
                'admin_email' => get_option( 'admin_email' ),
            ),
        )
    );
} );

// COMPLIANT — explicit opt-in gate
if ( isset( $_POST['myplugin_opt_in'] ) && '1' === $_POST['myplugin_opt_in'] ) {
    update_option( 'myplugin_tracking_opt_in', 1 );
}

if ( get_option( 'myplugin_tracking_opt_in' ) ) {
    wp_remote_post( 'https://api.example.com/collect', $payload );
}
```

**Review questions:**
1. Is any outbound request made on activation, first-run, or cron before consent is stored?
2. Is the opt-in UI explicit, unambiguous, and default-off?
3. Is consent persisted and checked before every telemetry request path?
4. Are collected fields documented in `readme.txt` privacy disclosures?

**Verdict:** Flag as **FAIL** for any unconsented outbound call. Include the specific URL or domain found.

**Fix:** Wrap all outbound calls in an opt-in gate. Add a `Privacy Policy` section to `readme.txt` describing what data is collected and why.

**Pre-submission checklist:**
- [ ] No telemetry/analytics calls occur before explicit opt-in
- [ ] Opt-in control is visible and off by default
- [ ] Consent is stored and checked in every outbound path
- [ ] Privacy policy in readme explains data, destination, and purpose

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

**Code patterns (violation vs compliant):**

```php
// VIOLATION — executable JS loaded from third-party CDN
wp_enqueue_script(
    'myplugin-admin',
    'https://cdn.example.com/myplugin/admin.js',
    array(),
    '1.0.0',
    true
);

// COMPLIANT — executable JS bundled in plugin package
wp_enqueue_script(
    'myplugin-admin',
    plugins_url( 'assets/js/admin.js', __FILE__ ),
    array(),
    MYPLUGIN_VERSION,
    true
);
```

**Review questions:**
1. Are any script/style enqueues pointing to third-party domains for executable assets?
2. Is any runtime code download/execution path present (`eval`, dynamic `<script>`, remote includes)?
3. Does update/install logic bypass WP.org distribution channels?
4. Are external assets limited to permitted exceptions (fonts, genuine service embed)?

**Verdict:** Flag as **FAIL** for each externally loaded executable. Note the URL and the file/line where it is enqueued.

**Fix:** Bundle JS/CSS locally. Use the WP.org SVN for updates. Replace `<iframe>` admin pages with proper WP Admin UI backed by a REST or admin-ajax API.

**Pre-submission checklist:**
- [ ] All executable JS/CSS is packaged locally in the plugin
- [ ] No runtime remote code download or execution
- [ ] No external self-update/install mechanism
- [ ] Any external assets are documented and fall under allowed exceptions

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
- “Powered by” text/link in templates (scanner pattern: `(?<!x-)powered[ -_]by`)
- Backlink required to unlock an upgrade/feature (crosses Guideline 5 + 10)

**Exception:** A service may brand its own rendered output (e.g., a payment form branded with the payment processor's logo).

**Code patterns (violation vs compliant):**

```php
// VIOLATION — forced credit link on public output
add_action( 'wp_footer', function() {
    echo '<p class="myplugin-credit"><a href="https://vendor.example">Powered by Vendor</a></p>';
} );

// VIOLATION — backlink required for feature activation
if ( ! get_option( 'myplugin_keep_backlink' ) ) {
    wp_die( 'Please keep our credit link active to use this feature.' );
}

// COMPLIANT — optional, explicit opt-in, default off
if ( get_option( 'myplugin_show_credit_link', false ) ) {
    echo '<p class="myplugin-credit"><a href="https://vendor.example">Powered by Vendor</a></p>';
}
```

**Review questions:**
1. Is any “Powered by” or credit link injected into frontend output by default?
2. Can users disable the link without breaking functionality?
3. Is there any logic that ties feature access to keeping a backlink active?
4. Is consent for showing credits explicit (not implied) and persisted?

**Verdict:** Flag as **FAIL** if the link is on by default with no opt-out. Flag as **FAIL** if removing it breaks functionality.

**Fix:** Default the setting to `false` (hidden). Provide a clear checkbox in settings to enable it.

**Pre-submission checklist:**
- [ ] No credit/backlink is shown by default on public pages
- [ ] Credit link is strictly opt-in and user-controlled
- [ ] Disabling credit links does not disable any plugin functionality
- [ ] No upgrade path requires a backlink to remain active

---

### Guideline 11: No Admin Dashboard Hijacking

**Check:** Are admin notices, upgrade prompts, and nags limited and non-intrusive?

**Violation signals:**
- Site-wide admin notice that cannot be dismissed (no dismiss button, reappears on every page load)
- Upgrade/upsell prompt shown on every admin page, not just the plugin's own settings screen
- Plugin overrides the WordPress dashboard home page or injects full-page overlays
- Ad banners or tracking pixels placed in the WordPress admin area
- Admin settings page rendered as an external `<iframe>` instead of native WP admin UI

**Code patterns (violation vs compliant):**

```php
// VIOLATION — external iframe in admin page
add_action( 'admin_menu', function() {
    add_menu_page( 'My Plugin', 'My Plugin', 'manage_options', 'myplugin', function() {
        echo '<iframe src="https://app.vendor.example/dashboard" style="width:100%;height:80vh;border:0"></iframe>';
    } );
} );

// COMPLIANT — native admin page shell with server/API data fetch
add_action( 'admin_menu', function() {
    add_menu_page( 'My Plugin', 'My Plugin', 'manage_options', 'myplugin', function() {
        echo '<div class="wrap"><h1>My Plugin</h1><div id="myplugin-admin-app"></div></div>';
    } );
} );

add_action( 'admin_enqueue_scripts', function( $hook ) {
    if ( 'toplevel_page_myplugin' !== $hook ) {
        return;
    }
    wp_enqueue_script(
        'myplugin-admin',
        plugins_url( 'assets/js/admin.js', __FILE__ ),
        array( 'wp-api-fetch' ),
        MYPLUGIN_VERSION,
        true
    );
} );
```

**Review questions:**
1. Does any admin screen render plugin UI inside an external iframe?
2. Is the plugin using native WP admin pages and capabilities checks instead?
3. Are upsells/notices scoped to plugin pages and dismissible?
4. Does removing upsell UI leave settings and core flows fully usable?

**Verdict:** Flag as **FAIL** for persistent undismissable notices or for notices appearing outside the plugin's own pages.

**Fix:** Use `is_plugin_page()` or an equivalent check to scope notices. Add a dismiss handler using `update_user_meta` or the WP dismissible notice pattern. Never show upgrade prompts on unrelated admin pages.

**Pre-submission checklist:**
- [ ] No external iframes used for admin/settings pages
- [ ] Admin UI is rendered as native WP admin pages
- [ ] Notices are dismissible and scoped to plugin screens only
- [ ] Removing notices/upsells does not break plugin functionality

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
- Scanner indicators: `files_library_core` and known core library filename matches (see scanner `known-libraries.php`)

**Code patterns (violation vs compliant):**

```php
// VIOLATION — loading custom/bundled jQuery copy
wp_enqueue_script(
    'myplugin-jquery',
    plugins_url( 'assets/vendor/jquery-3.7.1.min.js', __FILE__ ),
    array(),
    '3.7.1',
    true
);

// COMPLIANT — use WordPress-bundled jQuery handle
wp_enqueue_script( 'jquery' );
```

```php
// VIOLATION — bundling WP core PHP libs directly
require_once __DIR__ . '/vendor/PHPMailer.php';
require_once __DIR__ . '/vendor/SimplePie.php';

// COMPLIANT — use WordPress APIs that rely on core libs
wp_mail( $to, $subject, $message, $headers );
$feed = fetch_feed( $feed_url );
```

```php
// VIOLATION — registering local copy for a core-shipped package
wp_register_script(
    'myplugin-underscore',
    plugins_url( 'assets/vendor/underscore.min.js', __FILE__ ),
    array(),
    '1.13.6',
    true
);

// COMPLIANT — rely on core handle
wp_enqueue_script( 'underscore' );
```

**Review questions:**
1. Does the plugin ship filenames that match core-library patterns (`jquery`, `underscore`, `backbone`, `codemirror`, `moment`, `PHPMailer`, `SimplePie`)?
2. Are any core-library equivalents registered/enqueued from plugin paths instead of WP handles?
3. Are SMTP/feed features implemented through WordPress APIs (`wp_mail`, `fetch_feed`) rather than bundled core libs?
4. Can bundled duplicates be removed without breaking functionality?

**Verdict:** Flag as **FAIL** for each duplicate bundled library.

**Fix:** Replace bundled copies with `wp_enqueue_script( 'jquery' )` (or the appropriate WP handle). Remove the local copy from the plugin package.

**Pre-submission checklist:**
- [ ] No bundled copies of libraries already shipped by WordPress core
- [ ] Core script dependencies are loaded via WP handles
- [ ] Mail/feed functionality uses WordPress APIs instead of bundled core libs
- [ ] Any remaining third-party libs are not core duplicates and are documented/license-compliant

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

**Code patterns (violation vs compliant):**

```text
// VIOLATION — readme/plugin header mismatch
readme.txt:
Stable tag: 1.4.0

my-plugin.php header:
Version: 1.3.9
```

```text
// COMPLIANT — values are aligned and bumped together
readme.txt:
Stable tag: 1.4.1

my-plugin.php header:
Version: 1.4.1
```

```text
// VIOLATION — releasing functional changes without version increment
SVN tag: tags/1.4.1
Current release code: changed features, still Version: 1.4.1

// COMPLIANT — each functional release gets a new version tag
SVN tags: tags/1.4.1 -> tags/1.4.2
```

**Review questions:**
1. Does `readme.txt` `Stable tag` exactly match main plugin `Version`?
2. Is the new SVN tag version unique for this release?
3. Did functional/code changes occur without a version increment?
4. Are all user-facing changelog/release markers consistent with the bumped version?

**Verdict:** Flag as **FAIL** if `Stable tag` and plugin header `Version` do not match.

**Fix:** Bump both values together on every release. Tag the release in SVN under `tags/X.Y.Z`.

**Pre-submission checklist:**
- [ ] `Stable tag` matches plugin header `Version`
- [ ] Version is incremented for this release
- [ ] SVN tag uses the new version (`tags/X.Y.Z`)
- [ ] Changelog/release notes reflect the same version

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
