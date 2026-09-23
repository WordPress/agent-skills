---
name: wp-lab-pass
description: "Use when a change needs checking against a real WordPress site rather than stubs: run a lab pass on a disposable local site with the branch symlinked in, instrument the side effect (mail, HTTP, options, cron), toggle the environment between its production-like and suppressed states, drive it as each role, and verify the evidence rather than the screen. For feature work whose correctness depends on real capability resolution, real wp_mail(), or real admin markup."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+). Assumes a local site runner (WordPress Studio, wp-env, or Playground CLI) and WP-CLI. Browser steps need a browser-capable session; everything else runs from a shell."
---

# WordPress lab pass

A lab is a disposable, real WordPress site standing in for the site a change will
eventually run on. Its job is to **disagree with you**. Unit tests with stubbed
WordPress functions can only prove what they were told to believe; a lab has real
`WP_Roles`, real `wp_mail()`, real admin markup, and real user sessions.

## When to use

- A change depends on behaviour a stub cannot model: capability resolution, role
  storage, `wp_mail()`, cron, the REST stack, admin markup, multisite scoping.
- A design doc asks for a "live check" before merge.
- A test passes but the claim feels unearned — especially if the test seeds state
  the plugin itself would never persist.
- Before a release, for anything with a real runtime surface.

Skip it for pure logic, formatting, parsing, or docs. Those belong in unit tests,
where they are faster and more precise.

## Inputs required

Gather before starting:

1. **Which behaviours need proving.** Write them down as observable outcomes — "a
   suppressed environment sends nothing and says so", not "the mail code works".
2. **The branch or worktree** holding the change.
3. **A lab site** to use, and whether it is single-site or multisite.
4. **The side effect to instrument** — outgoing mail, HTTP requests, option
   writes, scheduled events. There is almost always one; find it before building
   the lab, because it determines the harness.
5. **Which roles** must be checked, and whether the plugin assigns them in a
   non-obvious way.

## Procedure

### 1. Point a real site at the branch

Symlink the plugin from the repository into the lab's `wp-content/plugins/`,
never copy it, and never keep source inside the site directory:

```bash
cd ~/Sites/mylab/wp-content/plugins
rm plugin-slug
ln -s /path/to/repo/worktree plugin-slug
```

**Restart the site afterwards.** Studio (and some other runners) mount symlinks at
start; repoint one while the site is running and the plugin silently does not
load. Then confirm the branch is actually live, rather than assuming:

```bash
wp eval 'echo class_exists("Your\\New\\Class") ? "branch loaded" : "NOT loaded";'
```

### 2. Instrument the side effect

Add a mu-plugin that records what the code hands to the outside world. For mail,
this replaces an SMTP catcher and needs no install:

```php
<?php
/**
 * Plugin Name: Lab mail capture
 * Description: Records wp_mail() arguments to a JSON lines file. Lab use only.
 */

define( 'LAB_CAPTURE_FLAG', WP_CONTENT_DIR . '/lab-capture-on' );
define( 'LAB_CAPTURE_LOG', WP_CONTENT_DIR . '/lab-mail-capture.jsonl' );

if ( file_exists( LAB_CAPTURE_FLAG ) ) {
	// Production-like: the plugin hands mail to WordPress, and we are the MTA.
	add_filter(
		'pre_wp_mail',
		static function ( $pre, $atts ) {
			lab_capture_record( 'sent', $atts );

			return true;
		},
		5,
		2
	);
}

/**
 * Append one record.
 *
 * @param string $outcome What happened.
 * @param array  $atts    wp_mail() arguments.
 */
function lab_capture_record( $outcome, $atts ) {
	file_put_contents(
		LAB_CAPTURE_LOG,
		wp_json_encode(
			[
				'time'        => gmdate( 'c' ),
				'outcome'     => $outcome,
				'to'          => $atts['to'] ?? null,
				'subject'     => $atts['subject'] ?? null,
				'headers'     => $atts['headers'] ?? null,
				'attachments' => $atts['attachments'] ?? null,
				'message'     => $atts['message'] ?? null,
			]
		) . "\n",
		FILE_APPEND
	);
}
```

Hook placement is the whole game. `pre_wp_mail` short-circuits before the send, so
a capture there stands in for the mail server. The `wp_mail` filter runs *after*
any short-circuit, so a plugin that suppresses mail never reaches it — which makes
absence from the log positive evidence that nothing was sent.

### 3. Make the environment states switchable

Most plugins behave differently on production and non-production sites. Drive that
from a **flag file**, not a code edit, so switching costs nothing and cannot be
forgotten in a commit:

```bash
touch wp-content/lab-capture-on   # production-like
rm wp-content/lab-capture-on      # suppressed / non-production
```

Confirm the switch took effect through the plugin's own accessor rather than
inferring it:

```bash
wp eval 'echo Your\\Plugin::suppresses_mail() ? "SUPPRESSING" : "not suppressing";'
```

### 4. Create real users for every role

```bash
wp user create labeditor labeditor@example.test --role=editor --user_pass=labpass1234
```

**Check what actually persisted.** A plugin may store a role differently from how
you assigned it — a custom role can be stored as a base role plus a marker, so a
site that drops the plugin cannot strand anyone on a role that no longer exists:

```bash
wp eval 'echo json_encode( get_userdata( 2 )->roles ), json_encode( get_user_meta( 2 ) );'
```

If the assignment did not stick, find the plugin's own assignment path and use it.
Do not force the stored value into a shape the plugin never writes — that is how a
lab starts agreeing with a broken test.

### 5. Drive it as a person would

Log in as each role and use the feature through the interface. For repetitive
submissions, post the real form from the page's own context so nonces and cookies
stay real:

```js
const form = document.querySelector('.my-form');
const url = form.getAttribute('action');   // NOT form.action — see failure modes
const fd = new FormData(form);
fd.set('subject', 'probe');
const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
```

### 6. Verify the evidence, not the screen

This is the step that earns the lab. For each behaviour, check the artefact:

- Did a message reach the capture file, with the right recipient and headers?
- Did **nothing** reach it where nothing should have?
- Does the stored log hold what it promised — and *not* hold what it promised not
  to, such as message bodies?
- Did the option, transient or scheduled event change as expected?

"The page said success" is the claim under test, never the proof.

### 7. Record and tear down

Write the result where the project keeps its verification record, including what
was **not** run. Then remove the harness and stop what you started:

```bash
rm wp-content/mu-plugins/lab-mail-capture.php wp-content/lab-mail-capture.jsonl
npx wp-env destroy --config /path/to/config   # destroy, not stop
```

Repoint the plugin symlink back at its usual target and restart, so the next
session does not inherit your branch.

## Verification

A lab pass is complete when every behaviour on the list from "Inputs required"
has an artefact behind it, and the record names anything that could not be
checked. If you cannot show the evidence, the item is unverified — say so rather
than rounding it up.

## Failure modes / debugging

- **The plugin silently does not load.** The symlink was repointed while the site
  was running. Restart, then assert a class from the branch exists.
- **The container cannot see your files.** Docker-backed runners often mount only
  `$HOME`; a package staged in the system temp directory is invisible. Stage it
  under `$HOME`.
- **Port already allocated.** Another project's environment holds it. Change your
  ports rather than stopping their containers.
- **`form.action` returns an element, not a URL.** A form containing an input
  named `action` shadows the property. Use `form.getAttribute('action')`.
- **Admin notices move.** Core's JavaScript relocates `.notice` elements to the
  top of the page, so a notice rendered inside a widget will not stay there.
  Assert on the notice's own markup, not on where it sits.
- **A role assignment does not stick.** See step 4; the plugin probably owns the
  assignment path.
- **The test passed but the lab disagrees.** The test seeded state the plugin
  never persists. Fix the test's fixture first, watch it go red, then fix the code.

## Escalation

Ask a human when: the lab needs credentials or a third-party service you were not
given; the behaviour only reproduces with client data you must not copy; disk or
container limits mean tearing down someone else's environment; or the lab finds a
defect whose fix changes a settled design decision rather than an implementation
detail.
