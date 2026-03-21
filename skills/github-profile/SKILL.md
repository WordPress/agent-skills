---
name: github-profile
description: >
  Audits and optimizes GitHub profile pages — profile README, metadata fields, pinned repositories,
  stats widgets, and contribution visibility. Use this skill whenever the user asks to improve,
  create, review, or optimize their GitHub profile, or mentions "profile README", "GitHub bio",
  "pinned repos", "GitHub stats", "contribution graph", or "GitHub presence". Also trigger when
  someone says things like "make my GitHub look good", "I want a better GitHub profile",
  "help me stand out on GitHub", "set up my GitHub page", or "optimize my developer profile".
  Works for both personal profiles and organization profile pages.
compatibility: "Platform-agnostic. Works with any GitHub account. Uses gh CLI when available."
---

# GitHub Profile Optimizer

This skill audits a GitHub profile and generates an optimized profile README along with recommendations for metadata, pinned repositories, and stats widgets. A strong GitHub profile is a developer's storefront — it shapes perception before anyone reads a line of code.

## Workflow

1. **Gather profile context** — Understand who this person/org is and what they want to showcase
2. **Audit the current profile** — Score every element of the profile's public presence
3. **Generate the profile README** — Write a polished, scannable README.md
4. **Recommend metadata and configuration** — Advise on bio, pinned repos, settings, and widgets

---

## Phase 0: Gather Context

### Determine profile type

Ask the user (if not obvious): is this a **personal profile** or an **organization profile**? The mechanics differ significantly:

| Feature | Personal profile | Organization profile |
| --- | --- | --- |
| README location | `username/username/README.md` | `.github/profile/README.md` |
| Visibility options | Public only | Public + member-only (via `.github-private` repo) |
| Pinned repos | Up to 6 | Up to 6 public + 6 member-only |
| Contribution graph | Yes | No |
| Achievements | Yes | No |

### Collect information

You need to understand the person/org before writing anything. Gather:

- **Username** — needed for stats widget URLs and the magic repo name
- **Current role/company** — what they do now
- **Primary technologies** — languages, frameworks, tools they work with
- **What they want to showcase** — open source projects, work experience, learning journey, company products
- **Tone** — professional, casual, creative, minimal
- **Target audience** — recruiters, collaborators, potential investors, open source community

If `gh` is available (`gh auth status`), pull what you can automatically:

- `gh api user` — name, bio, company, location, blog, twitter
- `gh api users/{username}/repos?sort=stars&per_page=10` — top repos for pin recommendations
- Check if `username/username` repo exists: `gh repo view {username}/{username} --json name 2>/dev/null`

---

## Phase 1: Audit

If the user has an existing profile, audit it. If they're starting fresh, skip to Phase 2.

### Score Table

```text
Category                        Score
─────────────────────────────────────
Profile README                  x/10
Profile Metadata                x/10
Pinned Repositories             x/10
Contribution Activity           x/10
─────────────────────────────────────
Overall                         x/40
```

### What to evaluate

#### Profile README (x/10)

- **Does it exist?** If there's no `username/username` repo with a README.md, that's the biggest miss.
- **Structure** — Does it flow logically? The ideal order:
  1. Greeting and identity statement (name, role, one-sentence hook)
  2. What you're working on (current projects, 2-3 sentences)
  3. Tech stack (badges or icons via shields.io or devicon)
  4. GitHub stats (dynamically generated cards)
  5. Featured projects (beyond what's pinned)
  6. Contact and social links (badge-style links)
  7. Personal touch (fun fact, motto, learning goal)
- **Length** — Aim for 400-800 words. Under 200 feels thin. Over 2,000 feels cluttered and undermines credibility.
- **Scannability** — Can someone get the gist in 10 seconds? Use `<details>` tags for collapsible sections to keep the visible portion clean.
- **Freshness** — Is dynamic content (blog posts, activity) still updating? GitHub stops cron-based Action triggers after 60 days of repo inactivity.

#### Profile Metadata (x/10)

Every empty field is a missed opportunity. Check:

- **Profile photo** — Clear, professional headshot? Consistent with LinkedIn/Twitter?
- **Bio** — Filled in? (160 character limit.) States role, primary technology, one distinguishing trait?
- **Company** — Linked with `@` prefix to the employer's org?
- **Location** — Filled in?
- **Website** — Linked?
- **Social accounts** — Twitter/X, LinkedIn linked? Cross-linking between profiles builds trust.
- **Pronouns** — Using this field signals inclusivity.
- **Status** — Set to show current work, availability, or open-to-work?

#### Pinned Repositories (x/10)

You can pin up to 6 repos (including repos you've contributed to).

- **Are all 6 slots used?** Empty slots waste prime real estate.
- **Do pinned repos have descriptions?** A pinned repo with "No description provided" looks careless.
- **Is there variety?** Showcase different technologies and project types.
- **Social proof** — Do pinned repos have stars? Prioritize repos with more stars.
- **Alignment** — Do the pins match the kind of work or roles the person wants to attract?
- **README quality** — Each pinned repo should have a polished README (this is where the github-repo skill applies).

#### Contribution Activity (x/10)

- **Contribution graph** — Is it reasonably active? Gaps are fine, but a completely empty graph raises questions.
- **Private contributions** — Is "Include private contributions" enabled in settings? This shows activity from private repos without revealing details.
- **Achievement badges** — Notable badges like Starstruck, Pull Shark, Arctic Code Vault Contributor? These add credibility.

---

## Phase 2: Generate the Profile README

### For personal profiles

Create the `username/username` repo's `README.md`. The profile README should be:

- **Scannable** — someone should get the gist in 10 seconds
- **Personal** — it should feel like a human wrote it, not a template
- **Purposeful** — every section should serve the person's goals

#### Template structure

```markdown
# Hi, I'm [Name] [optional wave emoji]

[One-liner about what you do and what drives you. This is the hook.]

## What I'm working on

[2-3 sentences about current projects, company, or focus areas.]

## Tech stack

[Badges using shields.io, e.g.:]
![Python](https://img.shields.io/badge/-Python-3776AB?style=flat-square&logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)

## GitHub stats

[Stats cards — see widget section below]

## Featured projects

[Brief descriptions of 2-3 key projects with links, if they want to highlight beyond pins]

## Connect with me

[Badge-style links to email, Twitter/X, LinkedIn, blog]
```

Adapt this to the person's tone and goals. A creative developer might want something playful. A startup founder might want something that signals credibility. A junior developer might emphasize learning and growth. Don't be afraid to deviate from the template — personality matters more than structure.

#### Stats widgets to include

Pick the ones that make sense for the person. Don't overload — 2-3 widgets is usually right.

**github-readme-stats** (anuraghazra) — The most popular option with 78,000+ stars:

```markdown
![GitHub Stats](https://github-readme-stats.vercel.app/api?username={username}&show_icons=true&theme={theme})
![Top Languages](https://github-readme-stats.vercel.app/api/top-langs/?username={username}&layout=compact&theme={theme})
```

Over 30 themes available. Can be self-hosted on Vercel to avoid rate limits.

**github-readme-streak-stats** (DenverCoder1) — Contribution streaks:

```markdown
![GitHub Streak](https://streak-stats.demolab.com/?user={username}&theme={theme})
```

**github-profile-trophy** (ryo-ma) — Trophy icons:

```markdown
![Trophies](https://github-profile-trophy.vercel.app/?username={username}&theme={theme}&no-frame=true&row=1)
```

#### Badges for tech stack and social links

Use **shields.io** combined with **Simple Icons** (3,000+ brand logos):

```text
https://img.shields.io/badge/-{Label}-{Color}?style={style}&logo={logo}&logoColor=white
```

Styles: `flat`, `flat-square`, `plastic`, `for-the-badge`, `social`

For social links, wrap badges in links:

```markdown
[![LinkedIn](https://img.shields.io/badge/-LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white)](https://linkedin.com/in/{handle})
[![Twitter](https://img.shields.io/badge/-Twitter-1DA1F2?style=flat-square&logo=twitter&logoColor=white)](https://twitter.com/{handle})
```

#### Dynamic auto-updating content (optional, requires GitHub Actions)

If the person blogs or creates content, suggest these:

- **blog-post-workflow** (gautamkrishnar) — Auto-pulls latest posts from RSS feeds into the README. Uses HTML comment placeholders. Needs a scheduled GitHub Action (daily cron).
- **waka-readme-stats** — Coding time metrics from WakaTime.

Remind them: GitHub stops cron triggers after 60 days of repo inactivity. The blog-post-workflow includes a keepalive feature; others may not.

### For organization profiles

Create `.github/profile/README.md` in the org's `.github` repo.

Organization profile READMEs should be more structured and less personal:

- What the organization does
- Key products or projects (with links to repos)
- How to get involved (contributing, jobs, community)
- Contact and social links

Optionally, create a `.github-private/profile/README.md` for member-only content:

- Internal resources and onboarding links
- Private repo directory
- Team information

Remind the user to **verify their organization's domain** (Settings → Verified & approved domains) for the verified badge.

---

## Phase 3: Recommendations

Beyond the README, provide specific recommendations for:

### Metadata to update

List exactly what to change in GitHub settings. Be specific:

- "Set your bio to: [suggested text, under 160 chars]"
- "Add these topics to your top repos: [list]"
- "Set your status to: [suggestion]"

### Pinned repository strategy

Recommend which 6 repos to pin and why. Consider:

- Variety across technologies
- Star count (social proof)
- README quality (each pinned repo should look polished)
- Alignment with career/business goals

If their best repos have weak READMEs, suggest improving those first (this is where the github-repo skill comes in — mention it).

### Profile generators (for quick starts)

If the user wants a faster path, mention these tools:

- **GPRM** (gprm.itsvg.in) — No-code generator with 300+ tech icons
- **rahuldkjain's generator** — Popular fill-in-the-blanks tool
- **readme.so** — Drag-and-drop editor for both profile and project READMEs

Recommendation: start with a generator, then customize to add personality and remove boilerplate.

---

## Phase 4: Verify

- Confirm the README renders correctly (check markdown syntax, badge URLs, image links)
- Check that all shields.io badge URLs are valid (correct logo names, hex colors)
- Verify stats widget URLs use the correct username
- If generating locally, remind the user to create the magic repo (`username/username`) if it doesn't exist, and push the README there
- Summarize next steps: what to commit/push, what to change in GitHub settings manually
