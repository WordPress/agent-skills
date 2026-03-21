---
name: "wp-accessibility"
description: "WordPress accessibility: auditing, WCAG 2.2 AA compliance, semantic HTML, focus management, ARIA landmarks, screen-reader-text, wp.a11y.speak(), form accessibility, theme accessibility-ready requirements, and automated/manual testing workflows. Use when building, reviewing, or testing WordPress themes, plugins, or blocks for accessibility."
compatibility: "Targets WordPress 6.9+ (PHP 7.2.24+, WCAG 2.2 AA). Applies to themes, plugins, blocks, and admin UI. Testing workflows assume macOS with VoiceOver; adapt for other screen readers."
---

# WordPress Accessibility

## Scope

- Use this skill when building, reviewing, or testing WordPress code for accessibility.
- Covers WCAG 2.2 AA compliance as required by WordPress core: "All new and updated code released in WordPress must conform with WCAG version 2.2 at level AA."
- Primary reference: [WP Accessibility Knowledge Base](https://wpaccessibility.org/) — community-maintained documentation for WordPress accessibility.
- For block-specific markup and attributes, combine with `wp-block-development`.
- For theme.json and template structure, combine with `wp-block-themes`.
- For Interactivity API directive accessibility, combine with `wp-interactivity-api`.

## Execution Boundary

- Primary responsibility: identify and fix accessibility issues in WordPress code.
- Read and audit markup, CSS, and JavaScript for WCAG violations.
- Generate accessible patterns; never generate inaccessible ones even if asked.
- Do not disable or work around accessibility features to "simplify" code.

## Semantic HTML

Use the correct element for the job. Never use `<div>` or `<span>` for interactive elements.

| Intent | Correct element | Wrong pattern |
|---|---|---|
| Trigger an action | `<button>` | `<div onclick>`, `<a href="#">` |
| Navigate to a URL | `<a href="...">` | `<span onclick>`, `<button>` that changes location |
| Group related form fields | `<fieldset>` + `<legend>` | Bare `<div>` wrapper |
| Data table | `<table>` + `<th scope>` + `<caption>` | CSS grid of `<div>`s |
| Section heading | `<h1>`–`<h6>` in hierarchy | `<div class="heading">` |

### Heading Hierarchy

- Every page must have exactly one `<h1>`.
- Headings must not skip levels (no `<h2>` → `<h4>`).
- Heading text must be meaningful and describe the section content.
- Use `.screen-reader-text` for headings that provide structure without visual display.

## Screen Reader Text

The `.screen-reader-text` class hides content visually while keeping it accessible to assistive technology. This is the WordPress standard — never use `display: none` or `visibility: hidden` for content that should be announced.

```css
.screen-reader-text {
    border: 0;
    clip-path: inset(50%);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
    word-wrap: normal !important;
}

.screen-reader-text:focus {
    background-color: #eee;
    clip-path: none;
    color: #444;
    display: block;
    font-size: 1em;
    height: auto;
    left: 5px;
    line-height: normal;
    padding: 15px 23px 14px;
    text-decoration: none;
    top: 5px;
    width: auto;
    z-index: 100000;
}
```

### Common uses

- **Contextual link text:** "Read more" links need hidden context — `<a href="...">Read more<span class="screen-reader-text"> about accessible forms</span></a>`
- **Skip links:** Must become visible on focus (the `:focus` styles above handle this)
- **Table captions:** When a visual caption is redundant but screen readers need table purpose
- **Structural headings:** Providing hierarchy without visual noise

## Landmark Roles

All page content must be within semantically meaningful landmarks.

| Element | Default ARIA role | Notes |
|---|---|---|
| `<header>` | `banner` | Only as direct child of `<body>` |
| `<nav>` | `navigation` | Label with `aria-label` when multiple |
| `<main>` | `main` | Exactly one per page |
| `<aside>` | `complementary` | Sidebars, related content |
| `<footer>` | `contentinfo` | Only as direct child of `<body>` |

### Multiple landmarks of the same type

```html
<nav aria-label="Primary">
    <!-- main navigation -->
</nav>

<nav aria-label="Footer">
    <!-- footer navigation -->
</nav>
```

Do not include the word "navigation" in the `aria-label` — assistive technology already announces the role.

### Backward compatibility

For older browser/AT combinations, add explicit roles: `<header role="banner">`. WordPress core still does this.

## Focus Management

### Visual focus indicators

Every interactive element must have a visible `:focus` style. Always define both `:hover` and `:focus`:

```css
.button:hover,
.button:focus {
    outline: 2px solid #0073aa;
    outline-offset: 2px;
}
```

Never use `outline: none` without providing an alternative visible indicator.

### tabindex rules

| Value | Use |
|---|---|
| `tabindex="0"` | Add non-interactive element to tab order (rare — prefer semantic HTML) |
| `tabindex="-1"` | Programmatically focusable but not in tab order (for focus management) |
| `tabindex="1+"` | **Never use.** Positive values create unpredictable tab order |

### Focus trapping (modals)

When a modal/dialog opens:

1. Move focus to the first focusable element inside.
2. Trap Tab/Shift+Tab within the modal boundaries.
3. Close on Escape.
4. **Restore focus** to the element that opened the modal when it closes.

### Focus restoration

After dynamic content updates (AJAX, SPA navigation), move focus to the new content or a meaningful summary. Never leave focus on a destroyed element.

## Dynamic Content Announcements

### wp.a11y.speak()

WordPress provides `wp.a11y.speak()` to announce dynamic changes to screen readers via ARIA live regions:

```javascript
import { speak } from '@wordpress/a11y';

// Polite (non-interrupting, default) — status updates, search results count
speak('3 results found');

// Assertive (interrupting) — errors, time-sensitive alerts
speak('Session expiring in 2 minutes', 'assertive');
```

### When to use

- Search results updated via AJAX
- Form validation errors
- Content loaded dynamically (infinite scroll, load more)
- Status changes (saving, published, trashed)
- Cart/checkout updates

### PHP equivalent

```php
wp_script_is( 'wp-a11y', 'enqueued' ); // Verify it's loaded
```

Enqueue `wp-a11y` if your script uses `speak()` and it's not already loaded by the block editor.

## Form Accessibility

### Labels

Every input must have a programmatically associated label:

```html
<!-- Explicit association (preferred) -->
<label for="email">Email address</label>
<input type="email" id="email" name="email" autocomplete="email">

<!-- Wrapping (acceptable) -->
<label>
    Email address
    <input type="email" name="email" autocomplete="email">
</label>
```

- Never rely on `placeholder` as the only label — it disappears on input.
- Use `.screen-reader-text` on the `<label>` only when a visual label is truly redundant (e.g., a single search field with a submit button labeled "Search").

### Grouped fields

```html
<fieldset>
    <legend>Shipping address</legend>
    <label for="street">Street</label>
    <input type="text" id="street" autocomplete="street-address">
    <!-- ... -->
</fieldset>
```

Radio buttons and checkboxes that form a group must always be in a `<fieldset>` with a `<legend>`.

### Error handling

1. Validate and announce errors clearly — not just with color.
2. Associate error messages with their fields using `aria-describedby`.
3. On submission failure, move focus to an error summary or the first invalid field.
4. Use `aria-invalid="true"` on fields with errors.

```html
<label for="email">Email</label>
<input type="email" id="email" aria-describedby="email-error" aria-invalid="true">
<p id="email-error" class="form-error">Enter a valid email address.</p>
```

### Required fields

```html
<label for="name">Name <span aria-hidden="true">*</span></label>
<input type="text" id="name" required aria-required="true">
```

### Autocomplete

Use `autocomplete` attributes on personal data fields — this is a WCAG 1.3.5 requirement:

```html
<input type="text" name="name" autocomplete="name">
<input type="email" name="email" autocomplete="email">
<input type="tel" name="phone" autocomplete="tel">
```

## Links and Buttons

### Link text

- Link text must describe the destination. Never use "click here" or bare "read more."
- If visual design requires short text, add context with `.screen-reader-text`.
- Links that open a new window must indicate this: `target="_blank" rel="noopener"` with a visual icon and screen reader text like "(opens in a new tab)."

### Images as links

```html
<a href="/profile">
    <img src="avatar.jpg" alt="Your profile">
</a>
```

When an image is the only content of a link, `alt` text must describe the link destination, not the image.

## Color and Contrast

### Minimum ratios (WCAG AA)

| Element | Ratio |
|---|---|
| Normal text (< 18pt / < 14pt bold) | 4.5:1 |
| Large text (≥ 18pt / ≥ 14pt bold) | 3:1 |
| UI components and graphical objects | 3:1 |

### Rules

- Never convey information by color alone. Use text, icons, or patterns alongside color.
- Ensure links within text are distinguishable — underline by default or maintain 3:1 contrast with surrounding text plus a non-color indicator on hover/focus.
- Test with browser dev tools (Chrome: Rendering > Emulate vision deficiencies).

## Images and Media

### Alt text

- **Informative images:** Alt describes content and function.
- **Decorative images:** `alt=""` (empty, not missing).
- **Complex images** (charts, diagrams): Short alt + longer description via `aria-describedby` or a linked description.
- **Never start with** "Image of" or "Picture of" — screen readers already announce the role.

### Animation and motion

- Respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
    }
}
```

- Any auto-playing animation must have a pause/stop mechanism.

## Skip Links

Every theme must include a skip-to-content link as the first focusable element:

```html
<a class="screen-reader-text" href="#main-content">Skip to content</a>
<!-- ... header, nav ... -->
<main id="main-content">
```

The link uses `.screen-reader-text` so it's hidden until focused via keyboard.

## Theme Accessibility-Ready Requirements

To qualify for the `accessibility-ready` tag in the WordPress theme directory, a theme must meet all of these (from the WP Accessibility Knowledge Base theme guidelines):

1. Skip-to-content link
2. Meaningful landmark roles and names
3. Keyboard navigation for all interactive elements
4. Controls with accessible names, roles, and states
5. Labeled form fields
6. Proper heading structure
7. Underlined links in body text (or 3:1 contrast + non-color hover/focus indicator)
8. Non-ambiguous link text
9. Sufficient color contrast (WCAG AA ratios)
10. Alt text for all informative images
11. Accessible audio, video, and animation handling
12. Content reflow and text spacing support
13. No unexpected context changes
14. Warning before opening new windows/tabs
15. Accessible hover/focus content (dismissable, persistent, hoverable per WCAG 1.4.13)
16. Accessibility statement
17. No recommendation of inaccessible plugins

## Testing

### Automated testing catches ~30% of issues

Automated tools are a starting point, not a finish line. Always combine with manual testing.

### Automated tools

| Tool | What it catches |
|---|---|
| axe-core (browser extension or CLI) | WCAG violations in rendered DOM |
| pa11y | CLI-driven WCAG testing, CI-friendly |
| Lighthouse (Chrome DevTools) | Accessibility score + specific violations |
| HTML validator (W3C) | Invalid HTML that breaks AT parsing |

#### axe-core in Playwright

```javascript
import AxeBuilder from '@axe-core/playwright';

test('page has no accessibility violations', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
});
```

#### pa11y in CI

```bash
npx pa11y http://localhost:8881 --standard WCAG2AA --reporter cli
```

### Keyboard testing

Test every interactive element with keyboard only (no mouse):

1. **Tab** through all focusable elements — is the order logical?
2. **Enter/Space** to activate buttons and links.
3. **Arrow keys** in menus, tabs, radio groups.
4. **Escape** to close modals/dropdowns.
5. Is **focus always visible**?
6. Are there any **keyboard traps** (focus stuck in a component)?

### Screen reader testing (VoiceOver on macOS)

1. **Cmd+F5** to toggle VoiceOver.
2. **VO+Right/Left** (Ctrl+Option+arrows) to navigate elements.
3. **VO+U** to open the rotor — check headings, links, landmarks, and form controls.
4. Verify: dynamic content announced, form errors reported, modals trapped focus, landmark structure makes sense.

### WordPress plugin testing tools

Referenced by the WP Accessibility Knowledge Base — install and activate on your test site:

- **WP Accessibility** — adds common fixes (skip link, toolbar, label corrections)
- **Access Monitor** — automated scanning with Tenon API
- **Sa11y** — page-level accessibility checker with visual annotations

## Accessibility Statement and Disclosure

### accessibility.txt

Plugins and themes can include an `accessibility.txt` file disclosing known issues:

```
# Accessibility Conformance

Standard: WCAG 2.2 AA
Known issues:
- Color picker lacks keyboard support (planned for v2.1)

Contact: accessibility@example.com
```

### Conformance reports

For formal compliance, use a VPAT (Voluntary Product Accessibility Template) or the W3C Accessibility Conformance Evaluation Methodology (ACE).

## Quick Reference: Common Violations

| Violation | Fix |
|---|---|
| Missing form label | Add `<label for="id">` or `aria-label` |
| Missing alt text | Add descriptive `alt` or `alt=""` for decorative |
| Low contrast | Increase to 4.5:1 (text) or 3:1 (large text/UI) |
| No visible focus | Add `:focus` outline styles |
| `<div>` as button | Replace with `<button>` |
| "Click here" link | Rewrite with descriptive destination text |
| `outline: none` | Remove or replace with visible alternative |
| `tabindex > 0` | Remove — use DOM order instead |
| `display: none` on SR content | Use `.screen-reader-text` instead |
| Dynamic update not announced | Add `wp.a11y.speak()` call |
| Missing skip link | Add as first focusable element |
| Heading level skipped | Fix hierarchy (h1 → h2 → h3) |

## Done Criteria

- All automated tests pass (axe-core, pa11y) with zero WCAG AA violations.
- Keyboard-only navigation reaches all interactive elements with visible focus.
- Screen reader announces all content, landmarks, headings, and dynamic updates correctly.
- Forms have associated labels, grouped fields, and accessible error handling.
- Color contrast meets AA ratios for all text and UI components.
- Skip link present and functional.
- `prefers-reduced-motion` respected.
- No positive tabindex values, keyboard traps, or inaccessible interactive elements.
