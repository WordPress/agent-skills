# Compromise signals — full taxonomy

This is the longer version of step 2 in [SKILL.md](../SKILL.md). Use it when the quick signal-to-category mapping isn't enough.

## How to read this doc

For each compromise category, you get:

- **Telltale signals** — what the site looks like / behaves like
- **Where to look first** — fastest place to confirm
- **Co-occurrence patterns** — what often comes with it
- **Notes** — operational gotchas

Most real compromises mix categories. A single attack frequently drops a phishing page, a redirect rule, and a backdoor in `mu-plugins/` all at once.

---

## 1. Defacement

**Telltale signals:**
- Visible message on the homepage (political, "hacked by X", joke content)
- Often replaces `index.php` or the active theme's `header.php`
- Site looks visually broken or replaced

**Where to look first:**
- File-modified timestamps on `index.php`, `wp-content/themes/<active>/header.php`, `wp-content/themes/<active>/index.php`
- Recent modifications to `wp-config.php` (defacement often paired with credential theft)

**Co-occurrence:**
- Often low-sophistication, opportunistic. May come bundled with other goodies (backdoor, redirect) because the attacker dropped everything they had.
- May be the noisiest signal of a compromise that started weeks earlier.

**Notes:**
- Visible defacement is the easiest to spot but means the attacker chose to be loud. Quieter compromises (SEO spam, mailer abuse) often run undetected for much longer.

---

## 2. SEO spam injection

**Telltale signals:**
- Search results show pages or keywords that don't exist on the visible site (pharma, casino, replica goods, payday loans)
- View source: hidden `<div>` with links, often pushed off-screen via CSS
- Sudden ranking changes — site ranks for keywords the owner never targeted
- Google Search Console reports "hacked content" or "spam" issue

**Where to look first:**
- Search the site via Google: `site:yourdomain.com viagra` (or pharma/loan/replica keywords)
- View source of homepage — look for hidden links
- Theme `footer.php`, `header.php`, `functions.php` for injected `echo` or `printf` with link content
- `wp_options` table for autoloaded options containing `<a href`
- `wp_posts.post_content` for added `<script>` or hidden link blocks

**Co-occurrence:**
- Often paired with cloaking — different content shown to Googlebot vs real users
- Combined with redirect injection for user-agent-conditional behavior

**Notes:**
- Cloaking makes manual verification hard. Use Google's "Fetch as Google" / URL Inspection in Search Console, or curl with `User-Agent: Googlebot`.
- This category is heavily monetized. Sites often stay infected for months because the compromise is invisible to the owner.

---

## 3. Redirect injection

**Telltale signals:**
- Visitors redirected to scam sites, dating sites, fake virus warnings, pharma
- Often mobile-only, or referrer-conditional (only when coming from Google search results)
- Site behaves normally for the admin (whose IP / cookies are excluded)

**Where to look first:**
- `.htaccess` (root + every subdirectory) — look for `RewriteRule`, `RewriteCond` with external URLs
- `wp-config.php` — prepended PHP code that does `header('Location: ...')`
- Active theme's `functions.php` — appended redirect logic
- Database `wp_options` table — option `siteurl` or `home` may have been changed
- Inline JavaScript injection in posts or footer

**Co-occurrence:**
- Conditional logic is the giveaway. Pure attacker-controlled redirects don't care about your user-agent — sophisticated ones do, to evade detection.
- The condition is the diagnostic: redirect-only-on-mobile, redirect-only-from-Google, redirect-only-on-first-visit.

**Notes:**
- Admin users with cached login cookies often don't see the redirect — always test from an incognito session on a different network.
- If site URL in `wp_options` was changed, you may be locked out of admin. Restore via direct DB edit.

---

## 4. Phishing-page host

**Telltale signals:**
- Unfamiliar login-looking pages added under the site (`/secure-update/`, `/PayPal/login/`, `/banking/`, etc.)
- Pages mimic well-known brands (PayPal, banks, DHL, Microsoft 365)
- Often pure HTML+PHP files dropped, not WordPress posts
- Host abuse team notification citing phishing

**Where to look first:**
- `wp-content/uploads/` for `.php`, `.html`, and folders with brand names
- Site root for unfamiliar folders containing index files
- Recent file additions: `find . -type f -mtime -7 -name "*.php" -o -name "*.html"`

**Co-occurrence:**
- Almost always paired with credential compromise — the attacker uses the phishing page to steal credentials, sometimes from the host themselves
- Often comes with email-sending capability (to lure victims to the phish)
- Backdoor near-guaranteed — attacker wants to be able to re-upload phishing pages

**Notes:**
- Host abuse teams treat phishing as one of the most serious categories — expect a short window before suspension if not addressed.
- Brand impersonation is a legal issue too — the impersonated brand may serve takedowns directly to the host.

---

## 5. Mailer abuse (outbound spam)

**Telltale signals:**
- Customers / random people complain about spam from `your-domain.com`
- Domain landed on blocklists (Spamhaus, SpamCop, SORBS)
- Sudden surge in outbound mail volume
- Hosting provider flags the account for outbound spam

**Where to look first:**
- Mail logs (if accessible) — look for high-volume sends to unfamiliar recipients
- `wp_cron` events — spam often runs on a schedule via a custom hook
- Database for unfamiliar tables with names like `wp_mail_queue`, `wp_recipients`, etc.
- `wp-content/` for standalone PHP scripts using `mail()` or `wp_mail()` directly

**Co-occurrence:**
- Phishing-page host (mailer abuse is often the delivery mechanism for phishing campaigns)
- Mass user enumeration via WP forms

**Notes:**
- Outbound mail abuse damages the domain reputation for legitimate mail. Even after cleanup, transactional emails may bounce until the domain reputation recovers.
- Hosting providers act fast on this — they bear the abuse complaints, and their IPs get blocklisted.

---

## 6. Cryptominer

**Telltale signals:**
- Mysterious high CPU usage, slow site
- Hosting provider warns about resource exhaustion
- Processes you didn't start (visible via `top`/`htop` if you have shell access)
- `/tmp` files with random names

**Where to look first:**
- Process list: anything PHP-based running in a loop, or unfamiliar binaries
- `/tmp/` and other writable directories for downloaded binaries
- `wp-config.php` and `mu-plugins/` for code that spawns child processes (`exec`, `system`, `shell_exec`)
- Cron: `wp cron event list` for hooks that fire frequently and execute external commands

**Co-occurrence:**
- Backdoor (the miner needs a way to be re-installed if killed)
- Sometimes paired with SEO spam (one attacker, multiple monetization paths)

**Notes:**
- On shared hosting, the host will usually catch this quickly — they're paying the CPU bill.
- Browser-side cryptominers (JS injected into pages) are a separate sub-category — look for unfamiliar `<script>` tags using crypto-mining libraries (Coinhive descendants, etc.).

---

## 7. WP-VCD and other known malware families

**Telltale signals:**
- `eval(gzinflate(base64_decode(...)))` blocks in PHP files
- Newly-added `wp-tmp.php` or `wp-feed.php` files in WP root
- Same code pattern across multiple files (one file infects others on load)

**Where to look first:**
```bash
grep -rl "eval(gzinflate(base64_decode" wp-content wp-admin wp-includes
grep -rl "wp-tmp.php\|wp-feed.php\|wp-vcd" .
```

**Co-occurrence:**
- WP-VCD typically arrives via pirated themes and plugins ("nulled" downloads). If user installed something from a non-official source, this is the prime suspect.
- Spreads internally across all PHP files on the host once installed
- Adds itself to scheduled tasks, hooks, and replicates

**Notes:**
- The eval+base64 pattern is the most recognizable malware signature in WP. Easy to grep for, easy to confirm.
- Eradication is hard because the malware actively re-infects from any surviving copy. Full file reset is usually required.

---

## 8. Supply-chain plugin compromise

**Telltale signals:**
- Specific plugin (or family of plugins from one vendor) was recently updated
- Multiple unrelated sites in the same plugin's user base report the same compromise pattern at the same time
- Compromise persists even after standard cleanup, because the "clean" plugin reinstall is still compromised

**Where to look first:**
- Recent activity in `wp-content/plugins/` matching plugin update timestamps
- Plugin's official changelog vs what's actually installed
- Plugin's GitHub issues / security advisories for recent CVEs
- Compare installed plugin files against the version on wordpress.org via `wp plugin verify-checksums`

**Co-occurrence:**
- Once weaponized, supply-chain plugin compromises often drop everything-and-the-kitchen-sink: backdoors, spam, redirects, miners.
- Plugin families from a single vendor that share a code base can all be affected by one compromise — observed pattern: a multi-plugin slider/popup/widget vendor with plugins active on tens of thousands of sites becomes a high-value supply-chain target.

**Notes:**
- This is the hardest category to detect early. The plugin's filesystem checksums won't help if the malicious version is the current published one.
- Mitigation: if a plugin vendor has had a confirmed supply-chain compromise once, treat their entire plugin family with extra scrutiny going forward. Audit installs of all plugins from that vendor when one is implicated.
- Subscribe to vulnerability feeds (Wordfence, Patchstack) for early warning of plugin compromises.

---

## 9. Anonymous backdoors (no other visible compromise)

**Telltale signals:**
- Site appears fully clean but file scans flag suspicious PHP
- Web shell files: `c99.php`, `r57.php`, `wso.php`, `b374k.php`, files with names like `<random>.php` accepting `?cmd=` parameters
- Empty / nearly-empty PHP files with a single `eval()` of a request parameter

**Where to look first:**
```bash
grep -rl "eval(\$_POST\|eval(\$_GET\|eval(\$_REQUEST\|assert(\$_POST" .
find . -name "*.php" -size -1k -mtime -90        # tiny suspicious files
```

**Co-occurrence:**
- Often the first thing dropped — attacker uses the backdoor to deliver everything else later
- Combined with persistence techniques (mu-plugins, cron, autoload options)

**Notes:**
- Easy to miss in a cleanup because they look small and unremarkable.
- If you find one, look harder — backdoors travel in packs.

---

## Combined-signal triage table

When multiple signals appear together, this combination usually tells you what you're dealing with:

| Combination | Likely category |
|---|---|
| Defacement + theme/index modified | Opportunistic file-overwrite |
| SEO spam + cloaking + hidden links in footer | Long-running monetization compromise |
| Redirect + conditional logic (mobile only) + `.htaccess` modified | Targeted ad-fraud redirect |
| Phishing page in uploads + outbound mail spike | Phishing campaign hosted on the site |
| Unknown admin user + recent plugin install | Backdoor + persistence |
| Cron event you don't recognize + outbound mail | Scheduled mailer abuse |
| eval+base64 pattern across many files | WP-VCD or similar |
| Plugin updated + multiple sites compromised same day | Supply-chain |
