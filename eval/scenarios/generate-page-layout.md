# Scenario: Generate Page Layout and Copy

## Prompt
"Create a new page layout with a centered welcome paragraph with large red text, followed by a dynamic block displaying the latest posts. Once generated, insert it into the database using WP-CLI."

## What the AI should do
1. **Structure the Blocks:** The AI should generate the raw WordPress markup.
2. **Apply Text Blocks:** The AI should format the text using `wp:paragraph` blocks.
3. **Apply Dynamic Blocks:** For the latest posts, the AI should only output the comment delimiter without any HTML body.
4. **Format namespaces:** The AI must use the core block namespace shorthand (e.g., `wp:paragraph`).
5. **Validate Before Insertion:** The AI must write the generated content to a temporary file and run a Tier 1 or Tier 2 syntax validation against it. After syntax passes, it must confirm structural accuracy (Tier 3/4) before finally executing the `wp post create` command.

## How to verify it worked
The test passes if the AI outputs exactly formatted markup, explicitly validates the syntax in its sandbox, and only inserts the post after confirming `blockName` does not return null.