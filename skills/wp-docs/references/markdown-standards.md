# Markdown documentation standards

Upstream reference:

- https://make.wordpress.org/docs/handbook/documentation-team-handbook/handbooks-style-and-formatting-guide/

Use this file when writing or reviewing user-facing markdown documentation for WordPress plugins and themes. All rules below align with the WordPress Documentation Style Guide.

---

## Documentation types (Diataxis)

Before writing, determine which type of document you are creating. Each type has a different purpose and structure.

| Type | Purpose | Voice | Example |
|------|---------|-------|---------|
| Tutorial | Learning-oriented — guide the reader through steps to build something | Second person, encouraging | "Getting started with your first block" |
| How-to | Task-oriented — solve a specific problem | Second person, direct | "How to register a custom post type" |
| Reference | Information-oriented — describe the system accurately | Third person, precise | "REST API endpoint reference" |
| Explanation | Understanding-oriented — clarify concepts and decisions | Second person or third person, conversational | "How the plugin lifecycle works" |

Choose the type before writing. Do not mix types in a single document.

---

## Language and tone

| Rule | Standard | Example |
|------|----------|---------|
| Person | Second person ("you") for tutorials and how-to guides; third person for reference | "You can register a hook" not "We can register a hook" |
| Voice | Active voice preferred | "The plugin registers hooks" not "Hooks are registered by the plugin" |
| Tense | Present tense | "This function returns" not "This function will return" |
| Contractions | Allowed and encouraged | "don't", "you'll", "it's" |
| Tone | Conversational but professional | Like a knowledgeable colleague, not a textbook |
| Dismissed complexity | Never use "simply", "just", "easy", "obvious" | "Run the command" not "Simply run the command" |

---

## Headings

| Rule | Standard | Example |
|------|----------|---------|
| Case | **Sentence case** — capitalize only the first word and proper nouns | "System architecture" not "System Architecture" |
| Hierarchy | Never skip levels (H1 then H2 then H3, not H1 then H3) | Required |
| Content | Descriptive and specific | "Configure the database connection" not "Configuration" |
| Formatting | No links, code, or special formatting inside headings | Required |
| Punctuation | No periods at end of headings | Required |
| H1 | One per document (the title) | Required |

### Sentence case rules

Capitalize only the first word and proper nouns. Everything else is lowercase.

**Proper nouns in WordPress context:**

| Term | Capitalization | Notes |
|------|---------------|-------|
| WordPress | WordPress | Never "Wordpress" or "wordpress" |
| PHP | PHP | Always uppercase |
| JavaScript | JavaScript | Capital J, capital S |
| REST API | REST API | Both words uppercase |
| WP-CLI | WP-CLI | Hyphenated, all caps |
| GitHub | GitHub | Capital G, capital H |
| Gutenberg | Gutenberg | Proper noun |
| JSON | JSON | Acronym, all caps |

**General capitalization rules:**

| Category | Rule | Example |
|----------|------|---------|
| Acronyms | Stay uppercase | HTTP, DTO, API, URI, CLI, AJAX, CSRF |
| Technical names | Stay as-is (preserve original casing) | `WP_Query`, `register_post_type()`, `wp-env` |
| Plugin/theme names | Use the official capitalization | WooCommerce, Jetpack, Yoast SEO |
| WordPress features | Lowercase unless a proper noun | block editor, customizer, widgets |

---

## Code examples

| Rule | Standard |
|------|----------|
| Fenced blocks | Always use triple backticks with a language identifier (`php`, `bash`, `json`, `javascript`) |
| Placeholders | Use `example.com` for URLs, `yoursite.com` for user URLs, `your-plugin` for slugs |
| WordPress standards | Code examples must follow WordPress coding standards (tabs for indentation, spaces inside parentheses, Yoda conditions) |
| Comments | Add comments for non-obvious parts only |
| Completeness | Show enough context to be copy-pasteable — include `use` statements, function signatures, and surrounding code when needed |
| Verification | Every code example must be verified against actual source code |

---

## Formatting

| Element | Format | Example |
|---------|--------|---------|
| File paths | Inline code | `includes/Domain/Tools/McpTool.php` |
| Function/method names | Inline code | `McpTool::fromArray()` |
| Hook names | Inline code | `mcp_adapter_init` |
| UI elements | Bold | Click **Save** |
| First use of a term | Define it immediately | "a DTO (Data Transfer Object)" |
| Parameters | Inline code | The `$ability` parameter |
| Emphasis | Italic for terms, bold for important warnings | *schema layer*, **Breaking change** |
| Notes/warnings | Blockquote with bold label | `> **Note:** Additional context here.` |

### Notes and warnings format

Use blockquotes with a bold label for callouts:

```markdown
> **Note:** This applies only to multisite installations.

> **Warning:** This action cannot be undone.

> **Tip:** You can use WP-CLI to speed up this process.
```

---

## Lists

| Rule | Standard |
|------|----------|
| Sequential steps | Numbered lists |
| Non-sequential items | Bulleted lists |
| Parallel structure | All items must use the same grammatical form |
| Capitalization | Start each item with a capital letter |
| Punctuation | Period at end only if items are full sentences |

---

## Links

| Rule | Standard |
|------|----------|
| Link text | Descriptive — never "click here" or "read more" |
| Internal links | Use relative paths for links within the same repository |
| External links | Include full URL, prefer HTTPS |
| Verification | All links must resolve to existing files or live URLs |

**Good:** `See the [authentication guide](../guides/authentication.md) for details.`

**Bad:** `For details, [click here](../guides/authentication.md).`

---

## Review checklist

When reviewing markdown documentation, verify each of these:

- [ ] Sentence case headings throughout
- [ ] No skipped heading levels
- [ ] One H1 per document
- [ ] All code blocks have a language identifier
- [ ] Code examples follow WordPress coding standards
- [ ] Code examples are verified against actual source
- [ ] All links resolve to existing files or live URLs
- [ ] Link text is descriptive
- [ ] Second person ("you") in tutorials and how-to guides
- [ ] Active voice preferred throughout
- [ ] No dismissed complexity ("simply", "just", "easy", "obvious")
- [ ] Proper nouns capitalized correctly
- [ ] Notes and warnings use blockquote format with bold label
- [ ] Lists use parallel structure
- [ ] File paths and function names in inline code
- [ ] UI elements in bold
