# Debugging block theme issues

## Styles not applying

Fast checks:

1. Confirm you edited the active theme (Site Editor → theme).
2. Check if user customizations exist (they override theme defaults).
3. Validate `theme.json` structure (typos can prevent styles from applying).
4. If a `var(--wp--preset--*)` / `var(--wp--custom--*)` reference is silently using its fallback, the slug is likely un-normalised — WordPress hyphenates digit/letter boundaries and camelCase transitions before emitting the CSS var. See `theme-json.md` § "Slug normalisation gotcha".

Remember the hierarchy:

- core defaults → theme.json → child theme → user customizations

## Templates/parts not showing

- Ensure files are in the correct folders (`templates/`, `parts/`).
- Template parts must not be nested in subdirectories.

## Style variations not updating

- If a user already selected the variation, the selection is stored in the DB.
- Test with a fresh site/user or reset customizations when appropriate.

