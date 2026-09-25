---
name: wp-abuse-and-compromise-response
description: "Use when responding to a suspected or confirmed WordPress site compromise — defacement, redirect injection, SEO spam, phishing-page host, mailer abuse, cryptominer, or supply-chain plugin attack. Walks through triage, investigation, cleanup, and post-cleanup hardening."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Requires WP admin OR SSH/SFTP access; full triage benefits from database access and WP-CLI. Some steps reference standard malware-scan services."
---

# WordPress Abuse & Compromise Response

## When to use

Trigger this skill when the user reports any of:

- **Visible signs:** defacement, unexpected popups/ads, redirects to scam/casino/pharma sites, search results showing keywords they never wrote.
- **Hidden signs:** sudden traffic drop, sudden CPU/memory spike, white-screen-of-death, unknown admin users, modified core files.
- **External signals:** Google Safe Browsing warning, Search Console security issue, host abuse notification, customer-reported spam from the site's domain.

Also trigger when the user *suspects* compromise but isn't sure — step 0 confirms or rules out.

This skill is response-focused. Upfront prevention (without an active incident) belongs in the planned `wp-security` skill; section 7 here covers post-cleanup hardening only.

## Inputs required

- Site URL (and any other domains pointing to the same install).
- Access available: WP admin / SSH or SFTP / database / WP-CLI on the server.
- Backup availability — when was the last known-clean backup?
- Reported symptoms (visible / hidden / external).
- Hosting environment — shared, VPS, managed, or self-hosted.
- Time-sensitivity — is the site actively serving malicious content to real users?

## Procedure

### 0) Triage and confirm WP install

- Run project triage: `node skills/wp-project-triage/scripts/detect_wp_project.mjs`
- Confirm `project.kind` is one of `wp-site`, `wp-plugin`, `wp-theme`, `wp-block-theme`, `wp-core`. If `unknown`, this skill does not apply — escalate.
- Run the fast compromise-signature scan: `node skills/wp-abuse-and-compromise-response/scripts/detect_compromise_signals.mjs`
- The scan does NOT replace step 3 — it surfaces high-confidence indicators (PHP in uploads, eval+base64 patterns, mu-plugins present, recent core mtimes, WP-flavored bait directories) that often confirm category early.

### 1) Contain — *preserve evidence, kill live sessions*

- If actively serving malware/phishing to visitors: take site offline (maintenance plugin, `.htaccess` deny-all, or have the host suspend serving while preserving files).
- If only suspected, no live harm: leave up, plan to act within hours.
- Take a file snapshot (compressed tar) and a DB dump for evidence. Store offline.
- **Rotate WP secret keys/salts now** — generate new at https://api.wordpress.org/secret-key/1.1/salt/ and replace in `wp-config.php`. This invalidates every existing session (including the attacker's) and does not send password-change emails. The attacker WILL notice their session was killed (it's an observable signal) and may try to re-establish access via any backdoor they planted — that's why this is paired with steps 2–7, not a standalone fix.
- **Defer full password rotation until after step 5** — backdoors will silently re-establish credential access if you rotate before cleanup. WordPress.org's [hacked-site FAQ](https://wordpress.org/documentation/article/faq-my-site-was-hacked/) recommends an initial reset-and-rotate-again approach; this skill prefers the salts-only initial rotation because it doesn't blast password-change emails to thousands of customer accounts on a WooCommerce/membership site. Pick the path that matches the situation — if you cannot complete investigation + cleanup within hours, also reset admin/editor passwords now and again after cleanup.

### 2) Classify the compromise type

Match signals to categories using [references/signals.md](references/signals.md). Quick mapping:

| Signal | Likely category |
|---|---|
| Defacement / political content | Defacement (often opportunistic file-overwrite) |
| Spam keywords in search results, hidden links in source | SEO spam injection |
| Redirects to casino/pharma, mobile-only or referrer-conditional | Redirect injection |
| Unfamiliar `/login`/`/verify`/`/PayPal` paths added | Phishing-page host |
| Outbound spam, domain on blocklists | Mailer abuse |
| `eval(gzinflate(base64_decode(...)))` patterns | WP-VCD-style eval+base64 loader (nulled-plugin malware family) |
| Plugin recently updated, multiple unrelated sites hit same day | Supply-chain plugin compromise |

Multiple categories often co-exist — one breach drops phishing + cryptominer + redirect simultaneously.

### 3) Investigate

Cheap deterministic checks first:

```bash
wp core verify-checksums                    # modified core files
wp plugin verify-checksums --all            # modified plugins from .org repo
wp user list --role=administrator           # unfamiliar admins?
wp cron event list                          # unfamiliar hooks?
find wp-content/uploads -name "*.php" -o -name "*.phtml" -o -name "*.phar"
```

Then DB queries, log triage, and the full investigation playbook in [references/investigation.md](references/investigation.md).

See [references/common-injection-points.md](references/common-injection-points.md) for the catalog of where attackers hide — particularly `mu-plugins/`, autoloaded `wp_options`, and `wp-config.php` prepend/append (intentionally not part of `verify-checksums`).

**Don't skip the local-machine scan.** Per the [WordPress.org hacked-site FAQ](https://wordpress.org/documentation/article/faq-my-site-was-hacked/), a major vector for site compromise is the **site owner's own computer** being infected with malware that exfiltrates SFTP/admin credentials from saved sessions or browser storage. Before assuming the breach happened server-side, ask the user to run a current malware scan on every machine that has logged into the site. If their local machine is the source, all server-side cleanup is futile until that's resolved.

**Check for known vulnerabilities affecting the installed versions.** A breach is often the result of an unpatched CVE in a specific plugin/theme/core version — knowing which CVE points at the entry point and confirms the attack vector. Run:

```bash
node skills/wp-abuse-and-compromise-response/scripts/detect_compromise_signals.mjs --check-vulns
```

This queries [wpvulnerability.com](https://www.wpvulnerability.com/) (free, no API key, aggregates WPScan + Patchstack + WP.org sources) for each detected component. Alternatives if you prefer different data sources:

- **Patchstack** vulnerability database: https://patchstack.com/database/
- **WPScan** API (free tier 25 requests/day; API key for more): https://wpscan.com/api
- **Wordfence Intelligence** CVE feed: https://www.wordfence.com/threat-intel/

If a vulnerability matching the installed version appears in the report, treat the unpatched component as the most likely entry point and prioritize patching it during step 4 (clean).

### 4) Clean

Before any destructive step, confirm with the user:

- [ ] Full file + DB snapshot of the current state stored outside the site.
- [ ] Access to reinstall any custom plugins/themes from original sources.
- [ ] Understanding that all logged-in users will be logged out when salts are rotated in step 5.

If any is no, pause and resolve. The compromise is rarely so urgent that an hour of prep matters less than an unrecoverable mistake.

Two paths. Prefer (a) when available.

**(a) Restore from a known-clean backup:** confirm backup predates compromise (timestamps + DB content), restore files + DB, re-apply legitimate changes since the backup, skip to step 5.

**(b) Manual cleanup:** replace WP core with a fresh wordpress.org download. Delete every plugin/theme directory and reinstall fresh from official sources. Reconstruct `wp-config.php` from scratch (do not "clean" the existing one — see [references/common-injection-points.md](references/common-injection-points.md) §2). Delete every `.php`/`.phtml`/`.phar`/`.htaccess` from `wp-content/uploads/`. Reset root `.htaccess` to WP defaults. Clean DB: delete suspicious users, suspicious `wp_options` rows (eval/base64/iframe patterns), injected `<script>` from `wp_posts`, unfamiliar tables, unfamiliar cron events.

### 5) Rotate credentials — full pass, after cleanup

(Salts were already rotated in step 1. This is the full credential pass.)

In order:

1. **Privileged WP users only** (NOT customers/subscribers/everyone). Default `wp user reset-password` emails every targeted user a reset link — on a WooCommerce or membership site this would blast thousands of emails to customers and to any attacker-controlled account. Scope tightly and skip the email blast:
   ```bash
   wp user reset-password \
       $(wp user list --role=administrator,editor --format=ids) \
       --skip-email
   ```
   Then notify the legitimate admins/editors out-of-band (Slack, in-person, separate email account) with new credentials.
2. DB user password (and update `wp-config.php`).
3. WP secret keys / salts — rotate **again** even if you rotated in step 1 (new at https://api.wordpress.org/secret-key/1.1/salt/).
4. Hosting credentials (cPanel / dashboard, SFTP, SSH).
5. SSH `authorized_keys` audit — remove unfamiliar keys.
6. API keys (Akismet, payment gateway, transactional mail, anything connected).
7. 2FA on every admin.

For non-admin users (subscribers/customers), prefer "force re-login + invalidate sessions" over a mass password reset. The salts rotation in step 1 already invalidates their sessions.

Per the [WordPress.org hacked-site FAQ](https://wordpress.org/documentation/article/faq-my-site-was-hacked/), salts and passwords should be rotated **again** after cleanup — even if you rotated already in step 1 — because the cleanup may have introduced changes you'd want to confirm don't include lingering compromise paths.

### 6) Verify clean

Re-run the cheap checks from step 3 — all must return clean. Then:

- External malware scanner (Sucuri SiteCheck, Wordfence, MalCare) reports clean.
- Submit Search Console reconsideration request if Safe Browsing flagged the site.
- Test originally-affected URLs in a private browser session on a different network.

### 7) Harden — *prevent recurrence*

Full checklist in [references/hardening.md](references/hardening.md). Minimum:

- 2FA for every admin. Non-negotiable.
- Strong unique passwords for all users.
- Limit login attempts (plugin or host-level fail2ban).
- `define('DISALLOW_FILE_EDIT', true);` in `wp-config.php`.
- Deny PHP execution in `wp-content/uploads/` via `.htaccess`.
- Updated core/plugins/themes; remove unused.
- Automated offsite backups, tested.

## Verification

Cleanup is successful when **all** of these hold:

- [ ] `wp core verify-checksums` returns no warnings.
- [ ] `wp plugin verify-checksums --all` returns no warnings.
- [ ] `wp user list --role=administrator` shows only known users.
- [ ] No `.php` files under `wp-content/uploads/`.
- [ ] No unknown plugins in `wp option get active_plugins`.
- [ ] No unknown cron events.
- [ ] External malware scanner reports clean.
- [ ] Originally-affected behavior is gone from a clean browser session.
- [ ] All credentials in step 5 rotated.
- [ ] 2FA enabled for every admin.

## Failure modes / debugging

| Symptom | Likely cause | Fix |
|---|---|---|
| Compromise reappears within days | Backdoor missed (commonly `mu-plugins/`, prepended `wp-config.php`, autoloaded `wp_options` row, scheduled cron) | Re-investigate persistence mechanisms — see [references/common-injection-points.md](references/common-injection-points.md) |
| Backup itself is compromised | Backup taken after initial breach | Restore further back OR proceed with manual cleanup (step 4 path b) |
| Site breaks after cleanup | Wrong plugin/theme version, missing custom mods | Test on staging first; diff against pre-cleanup snapshot for legitimate customizations |
| Reinfection within hours | Shared-hosting neighbor compromise, OR attacker still has SSH/control-panel access | Contact host. Audit `~/.ssh/authorized_keys`, control-panel SSO |
| Still Safe-Browsing-flagged after cleanup | Cached judgment | Submit reconsideration in Search Console after verifying clean externally |
| Site keeps sending spam after cleanup | Compromise at MTA/server level, not WP | Escalate to host — server-level audit needed |

## Escalation

Stop trying to handle inside the agent loop and escalate to a human when:

- Card data, health data, or other regulated PII may have been exposed → legal notification obligations (GDPR, US state breach laws, HIPAA).
- Site is sending mass spam to thousands of recipients → host should be involved immediately.
- You can't reach a clean state after one cleanup attempt → recommend a specialist forensic service.
- Attacker behavior suggests targeted/persistent threat (multiple reinfections, specific-file access patterns) → law enforcement may be appropriate.
- Site owner runs a business critical to other people (donations, hospital, school) and is over their head → managed-WP host or specialist firm.

## See also

- [references/signals.md](references/signals.md) — full signal-to-category mapping
- [references/investigation.md](references/investigation.md) — DB queries, log triage, deep checks
- [references/common-injection-points.md](references/common-injection-points.md) — catalog of where attackers hide (mu-plugins, autoload, drop-ins, etc.)
- [references/hardening.md](references/hardening.md) — full post-cleanup hardening checklist
- `scripts/detect_compromise_signals.mjs` — deterministic fast-scan helper called in step 0
