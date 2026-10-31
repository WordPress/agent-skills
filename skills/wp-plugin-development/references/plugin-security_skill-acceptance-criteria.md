# Passing Requirements for Plugin Security Skill

## Organization

### Separate Rules by Surface Area

- [ ] Group rules together by surface area (e.g., input handling, database operations, REST endpoints, file management, plugin lifecycle).

### Rule Types in Order

Order the rules in a FIFO (First In, First Out) manner, following the sequence in which they would be applied during the plugin development lifecycle.

- [ ] Move rule checks to sequential order in the SDLC
- [ ] The rules should not only follow their sequence in the SDLC, but also where they fall in the rule types (Prohibited, Required, Exceptions).

IE: the order the LLM would generally use to create a plugin:
- Planning the plugin structure and files
- Implementing database operations
- Handling input and output
- Registering REST endpoints and AJAX actions
- Managing files and external services
- Implementing plugin lifecycle hooks

## Code 

Each directive should provide explicit examples of both correct and incorrect implementations, highlighting potential security pitfalls and best practices.

**Sample Code Requirement**
- [ ] For each directive, ensure there are explicit examples of both correct and incorrect implementations. This can be provided by linking to existing documentation, or by including code snippets directly in the skill.
- [ ] For each directive explore chained exploits, providing examples of how multiple vulnerabilities could be combined to escalate an attack.

Manually verify that each rule has (or links to) corresponding code examples. 

**Directives Requiring Code Examples**
- [ ] Every privileged action, sensitive read, or persistent write checks authorization *and* CSRF protection.
- [ ] Every REST route and ability has a `permission_callback` that resolves and enforces the right capability.
- [ ] Security checks fail closed: their return values are checked, and the request stops when they fail.
- [ ] Input is read by explicit key, unslashed, validated, and sanitized for its type.
- [ ] Request values that select names, paths, callbacks, capabilities, or targets go through a fixed allowlist or map.
- [ ] Output is escaped late, including shortcode, dynamic block, and filter callback output.
- [ ] SQL uses `$wpdb->prepare()` for values and allowlisted identifiers.
- [ ] No code execution, executable uploads, or writes outside the plugin's uploads subdirectory.
- [ ] No `unserialize()` / `maybe_unserialize()` of untrusted data; magic methods have no dangerous side effects.
- [ ] Each weakness was assessed for what it unlocks when chained with others, not in isolation.
- [ ] External services are documented in the readme; credentials come from platform APIs.
- [ ] No global sessions, global PHP config changes, or silent plugin/theme/update changes.
- [x] SaaS and Third-Party Service Contract

## Evals 

Run the skillset against models in the real world, using the same parameters.

Evaluate the plugin against the defined rules and requirements.

### Input-Focused Evaluation

- [ ] Browser/admin option-write scenarios explicitly require nonce and appropriate capability checks before writes; invalid checks stop without writing.
- [ ] Type-focused scenarios describe the handler behavior to evaluate, including input types and sanitizer-result handling, rather than requiring edits to named source excerpts.
- [ ] Record scenario execution separately from JSON shape validation; list model, configuration, runtime/style checks, actual outcomes, and gaps.
- [ ] D-ID remains unresolved. Revisit the pre-existing claim below that a cast makes an ID well-formed rather than treating it as validated policy. After D-ID approval, cover malformed, array, zero, negative, valid, and integer-range-overflow inputs without expanding this task to other ID sources.

### Baseline

The agent skill must pass evaluations on all listed models to be considered compliant.

#### Claude
- Sonnet
- Opus
- Fable

#### GPT
- GPT-4
- GPT-4-turbo
- GPT-3.5
- GPT-3.5-turbo

#### Other models

Review other frontier lab's models to determine which are best suited for using the WordPress Agent's plugin development capabilities.

## Check Other Relevant Sources

Brief descriptions and section headings can be found from existing WordPress documentation, resource guides and handbooks. Reuse this content when possible.

Plugin Security: https://learn.wordpress.org/tutorial/introduction-to-securely-developing-plugins/
- [ ] Has a clear explanation of attack surfaces and mitigation strategies
- Has a good outline for Golden Rules
- Has Code Samples for good vs. bad code
> In the official WordPress Plugin Developer Handbook, the core methodology for preventing critical vulnerabilities like Remote Code Execution (RCE) centers around a foundational philosophy: Treat all data as untrusted and separate data from processing logic

> While the handbook covers generic security principles, securing a plugin against arbitrary code execution relies heavily on the strict implementation of four core pillars found across its Plugin Security documentation:


- [ ] [Common APIs - Security](https://developer.wordpress.org/apis/security/)

## Missing Requirements

Obfuscation
- [ ] Do not allow obfuscation in the plugin code (disallow `php` functions for obfuscation such as `eval`, `create_function`, `base64_decode`, `gzinflate`, and similar techniques)

Type Casting Integer IDs
- [ ] Cast numeric IDs to positive integers with `absint()` before use, and reject `0`. A cast makes the value well-formed; it does not authorize access to that object, so check the matching capability (for example `current_user_can( 'read_post', $post_id )`) before acting on it, and use `%d` in `$wpdb->prepare()` for SQL.
- [ ] **TODO:** Add this rule to `security.md`:
  - **Primary location:** *Inputs: Sanitization is Not Authorization or Allowlisting* → *Validate and Sanitize Input* → **Required** (TOC: "sanitizing, validating, and allowlisting input"). Add the bullet and the code sample below.
  - **Cross-reference in** *Request Authorization and REST Endpoints* → **Required**, at the object-level capability bullet (`current_user_can( 'edit_post', $post_id )`).
  - **Cross-reference in** *Output and SQL Escaping* → *SQL* → **Required**, at the `$wpdb->prepare()` bullet: use `%d` for numeric values.
  - **Checklist:** add the cast-and-authorize rule to the *Checklist*, next to "Input is read by explicit key, unslashed, validated, and sanitized for its type."

```php
/*
 * Unsafe: the ID is sanitized as text, not cast to an integer, so a value such
 * as "1 UNION SELECT user_pass FROM wp_users" stays intact and is interpolated
 * into the query. Nothing checks that the current user may read the post, so
 * changing the number also exposes private and draft posts.
 */
$post_id = sanitize_text_field( wp_unslash( $_POST['post_id'] ?? '' ) );
$title   = $wpdb->get_var( "SELECT post_title FROM {$wpdb->posts} WHERE ID = $post_id" );

// Safe: positive integer, 0 rejected, object-level capability checked, value prepared.
$post_id = absint( wp_unslash( $_POST['post_id'] ?? '' ) );
if ( ! $post_id || ! current_user_can( 'read_post', $post_id ) ) {
	wp_send_json_error( null, 403 );
}
$title = $wpdb->get_var(
	$wpdb->prepare( "SELECT post_title FROM {$wpdb->posts} WHERE ID = %d", $post_id )
);
```

**Attack methodology**

- **Uncast ID → SQL injection → credential disclosure.** The attacker replaces the ID with a SQL fragment, and the query returns data from another table, such as password hashes. Fix: cast with `absint()` *and* prepare the query with `%d`.
- **Cast ID, no capability check → insecure direct object reference.** The attacker changes the number to another user's post or order ID and reads or edits it. Casting does not stop this. Fix: check the object-level capability for that ID.


## Review of Specification

- [ ] Have models review claims made in the specification for accuracy and completeness
- [ ] Review the WordPress Security Team's [whitepaper](/Users/seth/Downloads/WordPressSecurityWhitePaper.pdf) for any missing considerations or best practices

## Final Passing Requirements

Before the PR should be deemed as an acceptable skill, the following criteria must be met:

- Skill should be well organized and easy to read by a human
- Generated code should pass all checklist items
- Generated code should pass the security sniffs from the Plugin Check Plugin
- Generated code should be easy to read by a human
- Edge cases should not be implemented, but noted for the user to review
- All Code Samples should follow WPCS
- Skill should be utilized and pass PCP

## Security Bulletins
Are provided for each identified security risk and vulnerability, detailing the relevant CWE and OWASP references where applicable.
These should **only** be reviewed if there is an edge case or potential vulnerability that requires deeper inspection.

## Allowlisting

Document which values, identifiers, and inputs are allowlisted within the plugin, including:
- Option names
- Meta keys
- Transient keys
- Table and column names
- File paths
- Hooks, routes, callbacks, classes, and methods
- Capabilities and privileged targets
