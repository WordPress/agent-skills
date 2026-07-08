# Verification

Test the pattern in a real WordPress environment.

## WordPress Playground (recommended)

```bash
npx @wp-playground/cli@latest server --auto-mount
```

Mount the theme directory and verify:
- Pattern appears in inserter under specified categories
- Pattern inserts without block validation errors
- Layout renders correctly at desktop and mobile widths
- Content is editable (text, images, buttons)
- If `templateLock` is used, locked elements resist editing

For template patterns, verify the Site Editor offers the pattern in the expected template replacement flow. If `Inserter: no` is used, confirm it is hidden from the general inserter but still available where intended.

## Manual check

- Paste block markup into the Code Editor view in WordPress
- Switch to Visual Editor — blocks should parse without "Attempt Block Recovery" prompts
- If recovery is needed, the markup has syntax errors

## Repo checks

Run the repo's existing lint, build, or test commands if the pattern change touches assets, generated files, or registration code.

## Updating existing patterns

Inserted pattern content is copied into posts/templates. Changing the pattern file does not retroactively update already inserted content, and changing block names or saved markup can create recovery prompts for newly inserted content.

## PR or package review

Confirm the diff is scoped to the intended pattern files, references, scripts, and eval scenarios. Do not mix unrelated repo updates into a pattern change.
