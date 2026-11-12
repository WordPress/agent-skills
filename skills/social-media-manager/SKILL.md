---
name: social-media-manager
description: "AI social media manager for Sub Zero Ice Cream. Creates, drafts, and publishes posts for LinkedIn, Instagram, Twitter/X, and Facebook via the Blotato API. Knows Sub Zero's brand voice, optional Blotato-generated visuals, platform-specific hashtags, and maintains posts-log.md at repo root. Triggers on: 'create a post', 'write a content calendar', 'draft social content', 'post to social media', or any Sub Zero social media request."
compatibility: "Standalone skill — no WordPress dependency. Compatible when used inside WordPress 6.9 (PHP 7.2.24+) projects. Requires BLOTATO_API_KEY env var and any HTTP client (curl, Node.js fetch, Python requests)."
---

# Sub Zero Ice Cream — Social Media Manager

## When to use

Use this skill whenever the user wants to:

- Create a single social post (any platform or all four)
- Build a weekly content calendar
- Generate a post with an AI visual
- Review, log, or publish drafted posts via Blotato

## Inputs required

- `BLOTATO_API_KEY` env var (value: the user's Blotato API key)
- A post brief, topic, or theme — or use brand defaults (see `references/brand-voice.md`)
- Visual preference: ask the user each time whether to generate a visual
- Platform: defaults to all four (LinkedIn, Instagram, Twitter/X, Facebook)

## Procedure

### 0) Discover connected account IDs

Fetch the user's connected accounts once per session and cache the IDs:

```
GET https://backend.blotato.com/v2/users/me/accounts
Header: blotato-api-key: <BLOTATO_API_KEY>
```

Filter by platform to get each account ID:
- `?platform=linkedin`
- `?platform=instagram`
- `?platform=twitter`
- `?platform=facebook`

Store: `{ linkedin: "...", instagram: "...", twitter: "...", facebook: "..." }`

If any account is missing, note it and skip that platform for this session.

### 1) Understand the request

Determine which workflow applies:

| Request type | Action |
|---|---|
| Single post brief | Write one post adapted for all 4 platforms |
| "Content calendar" | Write 4–7 posts (one per day), varied themes |
| "Post with visual" | Single post + generate a Blotato video/image |

If ambiguous, ask one clarifying question before proceeding.

### 2) Choose brand theme (if no brief given)

Pick from the Sub Zero content pillars (see `references/brand-voice.md`):

- Customization / flavor creation
- The liquid nitrogen experience
- Quality & indulgence
- Fun & celebration
- Innovation / seasonal specials
- Franchise success stories
- Business opportunity / franchise investment
- Shark Tank credibility

### 3) Write platform-specific drafts

Write one version per platform following these rules:

**Twitter/X** — ≤280 characters. Punchy, witty, wordplay on "sub-zero" or nitrogen. 1–2 inline hashtags max. No emojis unless they add punch.

**Instagram** — Visual-first. Lead with the sensory moment or a bold statement. 3–5 sentences. Place all hashtags at the end after a blank line. Up to 30 hashtags (core brand + contextual). Emoji-friendly.

**LinkedIn** — Professional but warm. 150–300 words. Lead with a hook. Franchise/business angle when relevant. 3–5 hashtags inline or at end. Speak to potential franchisees and current owners.

**Facebook** — Conversational, community-focused. 1–3 short paragraphs. Include a call to action. 2–3 hashtags.

Refer to `references/brand-voice.md` for tone, vocabulary, and do/don't examples.

### 4) Assemble hashtags

Always include core brand hashtags (adjust for post type):

- All posts: `#SubZeroIceCream` `#LiquidNitrogenIceCream` `#IceCreamExperience` `#CustomIceCream` `#PremiumIceCream`
- Business/franchise posts: add `#FranchiseOpportunity` `#SharkTankCompany`
- Generate 3–8 contextual hashtags based on post content (see `references/brand-voice.md` for examples)

### 5) Ask about visuals

Before submitting drafts, ask:

> "Would you like me to generate a visual for any of these posts? If so, which platform(s)?"

If yes, create a video/image via Blotato (see `references/blotato-api.md`):

```
POST https://backend.blotato.com/v2/videos/from-templates
Header: blotato-api-key: <BLOTATO_API_KEY>
Body: {
  "templateId": "<appropriate template>",
  "prompt": "<post caption as seed>",
  "isDraft": true,
  "title": "<short post title>",
  "useBrandKit": true
}
```

Upload the resulting video/image URL via `POST /v2/media` and use the returned URL in `post.content.mediaUrls`.

### 6) Present drafts for review

Show all platform drafts in a clear block with headings. Ask:

> "Looks good? I'll save these as drafts in Blotato. Reply 'yes' to confirm, or edit any version first."

**Do not call the Blotato posts API until the user approves.**

### 7) Submit approved drafts to Blotato

For each platform, call:

```
POST https://backend.blotato.com/v2/posts
Header: blotato-api-key: <BLOTATO_API_KEY>
Body: {
  "post": {
    "accountId": "<platform account ID from step 0>",
    "content": {
      "text": "<approved post text>",
      "mediaUrls": [],
      "platform": "<twitter|instagram|linkedin|facebook>"
    },
    "target": {
      "targetType": "account"
    }
  },
  "useNextFreeSlot": false
}
```

Capture the `postSubmissionId` from each response.

Poll `GET /v2/posts/{postSubmissionId}` until `status` is `scheduled`, `published`, or `failed`.

### 8) Log to posts-log.md

Append a new entry to `posts-log.md` at the repo root (create file if absent):

```markdown
## <ISO date> — <post theme/brief>

| Platform  | Status    | Post ID              | Live URL |
|-----------|-----------|----------------------|----------|
| Twitter/X | scheduled | <postSubmissionId>   | —        |
| Instagram | scheduled | <postSubmissionId>   | —        |
| LinkedIn  | scheduled | <postSubmissionId>   | —        |
| Facebook  | scheduled | <postSubmissionId>   | —        |

**Caption preview:** <first 120 chars of the Instagram caption>
```

When a post status transitions to `published`, update the Live URL column.

## Verification

- Account IDs returned for all four platforms
- Each draft shows correct platform-adapted text before submission
- Hashtags include all core brand tags plus contextual ones
- `postSubmissionId` received for each platform after submission
- `posts-log.md` updated with date, IDs, and status

## Failure modes / debugging

| Symptom | Check |
|---|---|
| 401 Unauthorized | `BLOTATO_API_KEY` is missing or wrong — verify the env var |
| Account not found | Platform not connected in Blotato — log in to Blotato and connect the account |
| Post stuck `in-progress` | Poll again after 30s; if still stuck after 2 min, check Blotato dashboard |
| Visual generation fails | Retry without a visual; use `POST /v2/media` with a direct image URL instead |
| Twitter/X post rejected | Text exceeds 280 chars — trim and resubmit |
| `posts-log.md` missing | Create it at repo root with the header `# Sub Zero Ice Cream — Posts Log` |

See `references/blotato-api.md` for full API reference.

## Escalation

- Blotato API errors or rate limits: check https://help.blotato.com
- Brand voice questions or major copy changes: consult `references/brand-voice.md` or ask the user
- New platform support (TikTok, Pinterest, etc.): Blotato supports them — extend account discovery in step 0
