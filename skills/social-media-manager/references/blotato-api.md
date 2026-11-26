# Blotato API Reference

**Base URL:** `https://backend.blotato.com`
**Auth header:** `blotato-api-key: <value>` (required on every request)
**Account email:** jerry.hancock+blotato@subzeroicecream.com

---

## 1. List connected accounts

```
GET /v2/users/me/accounts?platform=<platform>
```

**Platforms:** `twitter` `instagram` `linkedin` `facebook` `tiktok` `pinterest` `threads` `bluesky` `youtube`

**Response (200):**
```json
{
  "items": [
    {
      "id": "string",
      "platform": "string",
      "fullname": "string",
      "username": "string"
    }
  ]
}
```

For LinkedIn company pages / Facebook Pages, fetch sub-accounts:
```
GET /v2/users/me/accounts/{accountId}/subaccounts
```
Use the `pageId` field from sub-accounts when posting to a company page.

---

## 2. Upload media from URL

```
POST /v2/media
Body: { "url": "<publicly accessible URL or base64 image>" }
```

**Response (201):**
```json
{ "url": "string", "id": "string" }
```

Rate limit: 10 req/min. Max file size: 1 GB.
Use the returned `url` in `post.content.mediaUrls`.

---

## 3. Create a post (draft / scheduled)

```
POST /v2/posts
Body:
{
  "post": {
    "accountId": "<platform account ID>",
    "content": {
      "text": "<post caption>",
      "mediaUrls": [],
      "platform": "twitter|instagram|linkedin|facebook"
    },
    "target": {
      "targetType": "account"
    }
  },
  "useNextFreeSlot": false
}
```

To schedule: add `"scheduledTime": "2025-06-01T14:00:00Z"` (ISO 8601).
To use next available slot: set `"useNextFreeSlot": true`.

For LinkedIn company pages / Facebook Pages, also include `"pageId": "<sub-account page ID>"` inside `post`.

**Response (201):**
```json
{ "postSubmissionId": "string" }
```

Rate limit: 30 req/min.

---

## 4. Get post status

```
GET /v2/posts/{postSubmissionId}
```

**Response (200):**
```json
{
  "postSubmissionId": "string",
  "status": "in-progress|failed|published|scheduled",
  "scheduledTime": "string",
  "publicUrl": "string",
  "errorMessage": "string"
}
```

Rate limit: 60 req/min.
Poll every 15–30 seconds. Timeout after 2 minutes.
`publicUrl` is populated once status is `published`.

---

## 5. List scheduled (draft) posts

```
GET /v2/schedules?limit=<n>&cursor=<cursor>
```

Returns paginated list of scheduled/draft posts with their draft content and account details.

---

## 6. Update a scheduled post

```
PATCH /v2/schedules/{id}
Body:
{
  "patch": {
    "draft": { /* post draft object */ },
    "scheduledTime": "string"
  }
}
```

Response: 204 No Content.

---

## 7. Delete a scheduled post

```
DELETE /v2/schedules/{id}
```

Response: 204 No Content.

---

## 8. Generate video from template

```
POST /v2/videos/from-templates
Body:
{
  "templateId": "<template ID>",
  "prompt": "<post caption as creative seed>",
  "isDraft": true,
  "title": "<short descriptive title>",
  "useBrandKit": true
}
```

**Response (201):**
```json
{
  "item": {
    "id": "string",
    "status": "queueing|generating-script|script-ready|generating-media|media-ready|exporting|done|draft|creation-from-template-failed|insufficient-credits"
  }
}
```

Poll the video status endpoint until `status` is `done` before uploading the result via `POST /v2/media`.

---

## 9. Source resolution (AI post generation assist)

Use this to generate content drafts from a URL, article, or text:

```
POST /v2/source-resolutions-v3
Body:
{
  "source": {
    "sourceType": "text",
    "text": "<topic or brief>"
  },
  "customInstructions": "<brand voice instructions>"
}
```

**Response (201):** `{ "id": "string" }`

Check status: `GET /v2/source-resolutions-v3/{id}`
Statuses: `completed` `queued` `processing` `failed`

Rate limit: 30 req/min.

---

## Platform enum values

| Platform | `platform` value |
|---|---|
| Twitter / X | `twitter` |
| Instagram | `instagram` |
| LinkedIn | `linkedin` |
| Facebook | `facebook` |
| TikTok | `tiktok` |
| YouTube | `youtube` |
| Pinterest | `pinterest` |
| Threads | `threads` |
| Bluesky | `bluesky` |

---

## Error codes

| Code | Meaning |
|---|---|
| 401 | Invalid or missing `blotato-api-key` |
| 404 | Resource not found (bad ID) |
| 429 | Rate limit exceeded — back off and retry |
| 500 | Blotato server error — retry once, then check status page |
