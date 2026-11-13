# Database Operations Security: Audit Notes

Working draft, not part of the skill. Audit notes for the Database Operations section of `security.md`: code sample coverage, the raw SQL import exception, and the remaining work. The single combined sample was split into short unsafe/safe pairs, each placed directly after the rule it shows.

## Code Samples

- [x] **1. Values:** `$wpdb->prepare()` with `%s` / `%d`, and `$wpdb->insert()` / `update()` / `delete()` with a formats array.
  - Rules shown: "Prefer `$wpdb->insert()` / `$wpdb->update()` / `$wpdb->delete()` with a formats array for simple writes" and "Use `$wpdb->prepare()` for every dynamic value."
  - Neither rule has a sample today.
- [x] **2. Identifiers:** allowlist the table, column, or `ORDER BY` key, then pass it through `%i`.
  - Rule shown: "Treat table names, column names, `ORDER BY` keys, and other identifiers from the request as unsafe unless they come from an allowlist."
- [x] **3. Dynamic lists:** one placeholder per item in an `IN (…)` list, with the empty-list guard.
  - Rule shown: "Generate one placeholder per item in a dynamic list, and handle an empty list before querying."
- [x] **4. Attack methodology:** SQL injection, for example an uncast `ids` value of `1) UNION SELECT user_pass FROM wp_users -- ` leading to credential disclosure. Required by the acceptance criteria for every directive.

## Other Fixes

- [x] **Plugin Check:** `$in` is interpolated into the query, so `WordPress.DB.PreparedSQL.InterpolatedNotPrepared` will probably warn, and the placeholder-count sniff may too. Add a documented ignore, for example `// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- $in holds only %d placeholders.`
- [x] **Naming:** explain `$requested_*` above the unsafe/safe pair, not only in a comment inside the safe block.
- [x] **Rule types:** group the rules under **Prohibited**, **Required**, and **Exceptions**, like the Code Execution section. Move the `mysqli_*` / `PDO` prohibition out of the Required bullet and keep "never concatenate input into SQL" only in Prohibited.
- [x] **Exceptions:** restore the raw SQL imports exception, which the new version dropped.

## Raw SQL Import Exception

Committed in four parts under the title "Safe import exception":

- [x] **(1)** `3b3f4b9`: the first safe import sample (nonce, capability, plugin-written file).
- [x] **(2)** `3a6bd33`: keyed hash recorded at export and verified with `hash_equals()` before any statement runs; parser renamed `myplugin_split_statements()`; exception text updated.
- [x] **(3)** `02b981d`: second unsafe snippet (nonce and capability checked, but the file in uploads is trusted) and the attack methodology for a swapped backup file (CWE-345, CWE-89, OWASP A08:2021).
- [x] **(4)** `3509e00`: example for an administrator-supplied import file (`wp_handle_upload()` with a type allowlist, file deleted after reading, no signature).

## Remaining

Database Operations:

- [ ] **Pre-6.2 fallback:** the rule says to interpolate only the allowlisted constant value when `Requires at least` is below 6.2 (no `%i`). No example yet. A one-line comment may be enough.
- [ ] **User-controlled tables:** the TOC lists "working with user-controlled tables," but the identifier sample only lets the request choose the `ORDER BY` column. Show a request-chosen table name going through the allowlist and `%i`.
- [x] **Combined sample:** it interpolates `$in` and `$order`, so it now has the same `phpcs:ignore` comment the pairs have.
- [ ] **Prohibited list:** the "Executing SQL taken from request parameters" pair was removed as redundant, but the bullet is still there. Decide whether to merge it into the "Concatenating user input into SQL" bullet.
- [ ] **Backup storage:** the import samples keep `backup.sql` under `uploads/myplugin/`. The Code Execution section says backup archives must be protected from direct download, so add a cross-reference or one line on how the file is protected.
- [ ] **Acceptance criteria:** tick "SQL uses `$wpdb->prepare()` for values and allowlisted identifiers" in `plugin-security_skill-acceptance-criteria.md`.

To verify (none of the samples have been run or linted):

- [ ] Run the samples through PHPCS with WordPress Coding Standards, including the `phpcs:ignore` codes used.
- [ ] `$wpdb->prepare( $query, $ids )` after `array_filter()`, which can leave gaps in the array keys.
- [ ] `wp_handle_upload()` with `'mimes' => array( 'sql' => 'text/plain' )` on a real install, since the content-based MIME check may reject `.sql` files.

Optional:

- [ ] A note that rotating the site's salts invalidates old backup signatures.
- [ ] An example for `PDO`, which is covered only by the rule text.

Housekeeping:

- [x] Push the four "Safe import exception" commits.
