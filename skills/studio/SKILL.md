---
name: studio
description: "Use when a WordPress Studio site misbehaves because of something outside Studio: a port already taken, a .local domain that resolves to the wrong server, stale /etc/hosts entries, a global WP-CLI config or PHP on PATH shadowing Studio's, or another local stack (Local, MAMP, Valet, Docker) running alongside. Routes everyday Studio CLI work to Automattic's bundled studio-cli skill."
compatibility: "Targets WordPress 7.0+ (PHP 7.4.0+). Requires WordPress Studio 1.24+ (native PHP runtime) on macOS, Windows, or Linux, with the Studio CLI enabled (Settings → Studio CLI for terminal) or installed with `npm install -g wp-studio`."
---

# WordPress Studio: environment conflicts

## When to use

- A Studio site won't start, loads the wrong content, or loops on redirects.
- A `.local` custom domain or HTTPS works for one tool but not another.
- `studio wp` or `wp` reports an unexpected PHP version, path, or database.
- Studio shares the machine with Local, MAMP, Valet, Homebrew nginx/Apache, or Docker.

For everyday Studio work, such as creating, starting, configuring, pushing, pulling, previews, or running WP-CLI, use **studio-cli**. Automattic maintains that skill in the [Studio repo](https://github.com/Automattic/studio/tree/trunk/skills/studio-cli) and keeps it in step with each release. Studio can install it into a site at `.agents/skills/studio-cli`, under Settings → Skills. If it is installed, follow it for command syntax. This skill only covers what happens around Studio.

## Inputs required

1. Site path and status: `studio status --path <site> --format json` (gives the URL, PHP/WP version, Xdebug and online state).
2. Site settings: `studio config get --path <site>` (domain, https, php, file-access, debug flags).
3. The OS. Commands below are macOS/Linux; Windows equivalents are noted.

## Procedure

### 1. Confirm Studio's own view first

```bash
studio list
studio status --path <site>
studio config get --path <site>
```

Since 1.24, Studio runs every site on native PHP (8.2–8.5) and real file paths. Older advice about the WebAssembly "Sandbox" runtime, `appdata-v1.json` overriding `wp-config.php`, the `/wordpress` Xdebug path mapping, or calling a bundled `wp-cli.phar` no longer applies. Change settings through `studio config set` or the app, not by editing Studio's config files.

### 2. Port collisions

```bash
for port in 80 443 3306 8080 8443 8881 8882 8883 9003; do
  pid=$(lsof -t -i :$port 2>/dev/null | head -1)
  [ -n "$pid" ] && echo "Port $port: PID $pid ($(ps -p $pid -o comm=))"
done
```

Windows: `netstat -ano | findstr :<port>`, then `tasklist /FI "PID eq <pid>"`.

The usual culprits are Homebrew or MAMP nginx/Apache, Docker Desktop, another stack's router process that kept running after its app quit, and a second IDE listening for Xdebug on 9003. Stop the other process, or stop and start the Studio site so it picks a free port. Don't kill processes you can't identify.

### 3. Custom domains and HTTPS

- Domains must end in `.local`. HTTPS needs a domain and does not work on `localhost`.
- Studio writes the hosts file entry itself and asks for permission (UAC on Windows). Check for duplicates that other tools left:
  ```bash
  grep -n "\.local\|\.test" /etc/hosts
  ```
  Windows: `C:\Windows\System32\drivers\etc\hosts`. If two entries claim the same domain, remove the stale one (needs admin rights).
- If another web server owns 80/443, the domain can reach that server instead of Studio. Stop it, or drop the domain with `studio config set --path <site> --no-https --domain ""` and use the `localhost` URL. Studio also removes its hosts entry when the domain changes.
- Browser certificate warnings: Studio's CA lives at `~/.studio/certificates/studio-ca.crt`. On macOS it must be trusted by hand in Keychain Access. On Windows it is added automatically. On Linux use the app's Trust certificate button, or `certutil` into `~/.pki/nssdb`.
- Redirect loops usually mean `siteurl`/`home` in the database don't match the current domain and scheme. Check with `studio wp option get siteurl`, then fix the setting or the options so they agree.

### 4. WP-CLI and PHP shadowing

Run WP-CLI through `studio wp …`. It uses the site's PHP and works from any directory inside the site. If a bare `wp` gives odd results:

```bash
cat ~/.wp-cli/config.yml 2>/dev/null   # a global path: or php: here wins over the site
which wp php; php -v
```

Remove conflicting `path:` entries, or pass `--path` explicitly. Don't "fix" Studio by changing the global PHP.

### 5. File access and symlinks

The default `--file-access site-directory` applies `open_basedir`. Symlinked plugins or themes inside the site are allowed, and Studio restarts the site when you add one while it runs. A plugin that reads files outside the site will fail under this default. Only switch to `studio config set --file-access all-files` for code you trust.

### 6. Running alongside other stacks

- Local (Flywheel), MAMP, and Valet run their own MySQL and web servers. Studio uses SQLite at `wp-content/database/.ht.sqlite`, so a stray MySQL on 3306 matters only to plugins that assume MySQL.
- Don't symlink the same plugin checkout into two running stacks while you debug. Two PHP processes writing the same files or caches hides which site produced an error.
- Xdebug can be on for only one Studio site at a time, and only one IDE can listen on 9003.

### 7. E2E tests against a Studio site

Point Playwright's `baseURL` at the URL from `studio status`, and run a pre-flight check (`curl -sI <url>`) before the suite. Studio doesn't run a `webServer` for you. For CI, use wp-env or Playground (see the **wp-env** and **wp-playground** skills).

## Verification

- `studio status` shows the site online at the expected URL, PHP and WP version.
- `curl -sI <site-url>` returns 200 or a single redirect, not a loop.
- No second process owns the site's port, 80/443 (when using a domain) or 9003 (when debugging).
- `studio wp option get siteurl` matches the URL you load.

## Failure modes

- **Port in use after quitting another app:** its background service is still running. Find it with the port scan, then stop that service, not Studio.
- **Domain opens another tool's site:** a duplicate hosts entry or a foreign server on 80/443.
- **`wp` reports the wrong PHP:** a global `~/.wp-cli/config.yml` or PATH order. Use `studio wp`.
- **Plugin can't read a file:** the file-access default. Move the file into the site, or widen access deliberately.

## Escalation

If Studio itself crashes or a command fails with no outside cause, check `studio --version` against the [release notes](https://github.com/Automattic/studio/releases) and report it upstream at https://github.com/Automattic/studio/issues.
