---
name: wp-readme-optimizer
description: >
  Reviews and rewrites WordPress.org plugin readme.txt files for maximum quality.
  Use this skill whenever a user pastes, uploads, or references a WordPress plugin readme.txt,
  or asks to improve, audit, review, score, or optimize a plugin's WordPress.org listing page.
  Also trigger when the user says things like "make my plugin page better", "optimize my readme",
  "help me rank higher on WordPress.org", or "review my plugin listing". Always run the full
  audit + rewrite workflow unless the user explicitly asks for only one part.
compatibility: "Targets WordPress.org plugin directory. No runtime dependencies — text analysis and rewriting only."
---

# WordPress Plugin readme.txt Optimizer

This skill reviews a WordPress.org plugin readme.txt file with a structured audit, scores each section, and then produces a fully rewritten version. The goal is higher visibility in the WordPress.org plugin directory, better conversion of visitors to installs, and a more trustworthy plugin page.

## Workflow

1. **Read the readme.txt** — If a file is attached, read it. If the user pasted content, use that. If neither, ask the user to provide the readme.txt content.
2. **Infer the target keyword** — Before scoring, identify what keyword(s) this plugin should rank for. This anchors the entire audit.
3. **Run the audit** — Score each section and write specific, actionable findings.
4. **Produce the rewrite** — Deliver a drop-in replacement readme.txt, incorporating all audit findings.

---

## Phase 0: Keyword Inference

Before scoring anything, output a short block like this:

```text
**Primary keyword:**    contact form
**Secondary keywords:** spam protection, email notifications, WordPress form builder
**Inferred from:**      plugin name, tags, description content
**Confidence:**         high / medium / low
```

How to infer:

- Look at the plugin name, tags, and the first paragraph of the description
- Ask: "If I were a WordPress site owner who needed this plugin, what would I type into the search bar?"
- Primary keyword = the single phrase most likely to drive installs (usually 2–3 words)
- Secondary keywords = supporting terms that appear naturally in the readme or should

If confidence is **low** (e.g. the readme is very sparse), add a note: `<!-- Couldn't confidently infer primary keyword — consider telling the skill what your plugin is primarily for -->` and proceed with your best guess.

All scoring in Phase 1 is evaluated against this inferred keyword. If the keyword appears in the right places, that's a point in the section's favour. If it's absent where it should be, that's a deduction.

---

## Phase 1: Audit

### Scoring

Score each section out of 10. At the top of the audit, show a summary score table:

```text
Section                        Score
─────────────────────────────────────
Plugin Name & Tags             x/10
Short Description              x/10
Long Description               x/10
Installation                   x/10
FAQ                            x/10
Screenshots                    x/10
Changelog                      x/10
Stable Tag & Headers           x/10
─────────────────────────────────────
Overall                        x/80
```

**Score ranges:**

- **65–80** — Strong listing. Focus on polish: freshen changelog, improve screenshot captions, tweak tags.
- **45–64** — Solid foundation with real gaps. Rewrite will make a meaningful difference.
- **25–44** — Significant problems across multiple sections. Full rewrite needed.
- **0–24** — Bare minimum or placeholder readme. Treat the rewrite as building from scratch.

For each section, write 2–5 specific findings. A finding should name the problem, explain why it matters, and suggest a fix. Never be generic — always refer to the actual content.

### What to evaluate per section

#### Plugin Name & Tags

- Is the name descriptive of what the plugin *does*, not just a brand name?
- Does it include the primary keyword users would search for?
- Are up to 5 tags used? Are they the right ones — high-volume, specific to the plugin's function?
- Would a stranger immediately understand what the plugin does from the name alone?

#### Short Description (≤150 chars)

This is the most visible piece of copy — it appears in search results and on the plugin card.

- Does it lead with the user's problem or benefit, not the plugin's name?
- Is it under 150 characters (hard limit — truncation kills CTR)?
- Does it contain the primary keyword naturally?
- Is it specific (avoid vague claims like "powerful", "easy", "best")?
- Does it end before 150 chars — not mid-sentence?

#### Long Description

- Does the first paragraph act as a strong hook — benefit-led, not feature-led?
- Is the primary keyword used in the first 150 words?
- Are there H2/H3 headings to break up the text (using `== Heading ==` syntax)?
- Are features presented as user benefits, not just a bullet dump?
- Is there social proof — active installs, ratings, notable users?
- Is there a clear call to action (e.g. link to Pro, docs, or demo)?
- Does it include FAQ-style content or video embeds for richness?
- Are secondary/long-tail keywords naturally woven in?

#### Installation

- Are the steps numbered and complete?
- Does it cover both manual (FTP) and automatic (dashboard) methods?
- Are there any post-activation steps mentioned?

#### FAQ

- Are the questions things real users actually ask (check support forum topics if possible)?
- Do the answers contain keywords naturally?
- Is there at least one question that surfaces a common objection or concern?
- Are questions phrased the way a user would type them, not how a developer would write them?

#### Screenshots

- Is there a `== Screenshots ==` section?
- Does each screenshot have a caption (captions are indexed by the search engine)?
- Do captions describe what the user sees AND include relevant keywords?
- Are there enough screenshots to cover the key UI flows?

#### Changelog

- Is the changelog up to date?
- Does it follow the format `= X.X.X =` with bullet points underneath?
- Does the most recent entry communicate user-facing value, not just `"bug fixes"`?
- Is there a reasonable update cadence visible (signals active maintenance)?

#### Stable Tag & Plugin Headers

- Does `Stable tag:` match the latest tag in the `/tags/` SVN directory?
- Is `Requires at least:` conservative enough to not exclude users?
- Is `Tested up to:` current (within 1–2 major WP releases)?
- Is `Requires PHP:` declared?
- Is `License:` declared (GPL-2.0-or-later)?

---

## Phase 2: Rewrite

After the audit, produce the complete rewritten readme.txt inside a code block.

Rules for the rewrite:

- **Preserve all factual content** — don't invent features, screenshots, or version numbers that weren't in the original.
- **Improve, don't fabricate** — if a section is missing (e.g. no FAQ), write a placeholder with `<!-- TODO: add real questions from your support forum -->` rather than making things up.
- **Keep the exact readme.txt format** — WordPress.org uses a specific Markdown-like syntax. Follow it precisely (see Format Reference below).
- **Apply every audit finding** — the rewrite should address every issue flagged in Phase 1.
- **Keyword discipline** — use the primary keyword in: plugin name (if it fits), short description, first paragraph of long description, at least one FAQ question, and screenshot captions. Don't keyword-stuff; natural usage only.
- **Tone** — professional but human. Write for the person installing the plugin, not for the developer who built it.

---

## Format Reference

```text
=== Plugin Name ===
Contributors: username
Tags: tag1, tag2, tag3, tag4, tag5
Requires at least: 6.0
Tested up to: 6.7
Stable tag: 1.2.3
Requires PHP: 7.4
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Short description here. Max 150 chars. No period at end optional.

== Description ==

Long description here. Supports basic Markdown.
Use `== Heading ==` for H2, `= Subheading =` for H3.
**Bold**, `code`, and [links](https://example.com) work.

== Installation ==

1. Step one
2. Step two

== Frequently Asked Questions ==

= Question here? =

Answer here.

== Screenshots ==

1. Caption for screenshot-1.png
2. Caption for screenshot-2.png

== Changelog ==

= 1.2.3 =
* Fix: Description of fix
* Feature: Description of new feature

== Upgrade Notice ==

= 1.2.3 =
Brief note about why users should upgrade.
```

---

## Key principles (from the research)

These inform every judgment call in the audit and rewrite:

- **The Plugin Directory runs Elastic Search.** Keywords in title, tags, short description, long description headings, and FAQ questions all carry weight — but natural language wins over stuffing.
- **The short description is the highest-leverage field.** It's the snippet in search results. A weak short description kills CTR before anyone reads the long description.
- **Update recency is a trust signal.** Even trivial readme updates reset the "last updated" date. A stale plugin loses installs.
- **Support rating is a ranking factor.** The audit should flag if the changelog or description could be inviting unnecessary negative reviews (e.g., misleading claims).
- **Screenshot captions are indexed.** They're not just UX — they're SEO content.
- **Write for intent, not features.** Users search for what they want to *achieve*, not what the plugin *is*. Lead with outcomes.

---

## Output format

```text
## Audit

[score table]

### Plugin Name & Tags
[findings]

### Short Description
[findings]

[... remaining sections ...]

---

## Rewritten readme.txt

\```
[full rewritten readme.txt]
\```
```
