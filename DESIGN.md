# Sub Zero Nitrogen Ice Cream — Design & Brand Reference

> Derived from the 2018 Sub Zero Brand Style Guide (v2.0) and applied across
> **subzeroicecream.com** and **subzerocatering.com**. Includes current-state
> observations and actionable recommendations for design, taste/experience, and SEO.

---

## 1. Brand Foundation

### Mission
**"Celebrate Life's Moments"** — Ice cream as a personal, emotional experience.
Every touchpoint should feel celebratory, inviting, and a little bit wondrous.

### Brand Personality
| Pillar | Expression |
|---|---|
| **Inspiring** | Educates all ages; encourages curiosity and experimentation |
| **Simple** | Nothing overcomplicated — from store ops to the customer journey |
| **Unique** | Science-driven reinvention of the cold-treat experience |
| **Fresh** | Made-to-order, highest-quality ingredients, zero compromise |

### Tagline Vocabulary
- "Science makes it fresh"
- "-321° is super cold!"
- "…3-2-1 NITRO!"
- "What can we make special for you?"

---

## 2. Color Palette

### Primary Colors

| Role | Pantone | Hex (approx.) | Usage |
|---|---|---|---|
| Crimson Red | 7621 C | `#9B1B30` | Logo mark, accents, CTAs |
| Process Blue | 299 C | `#009CDE` | Primary brand blue, backgrounds |
| Navy Indigo | 2746 C | `#2D2F92` | Deep backgrounds, text on light |

### Secondary Colors

| Role | Pantone | Hex (approx.) | Usage |
|---|---|---|---|
| Positive Red | 7421 C | `#b50e1f` | Supporting accents, depth |
| Powder Blue | 2975 C | `#C7E8F3` | Light backgrounds, vapor cloud fields |
| Sky Blue | 297 C | `#71C5E8` | Gradients, tint layers, hover states |

### Web Implementation Notes
- **Primary CTA buttons**: `#9B1B30` fill, white label — strong contrast, brand-consistent
- **Hero/dark sections**: `#2D2F92` or `#009CDE` backgrounds with white type
- **Light sections**: `#C7E8F3` or white with `#2D2F92` text
- **Vapor cloud overlays**: White semi-transparent shapes over blue backgrounds (`#009CDE` or `#C7E8F3`)
- Minimum contrast ratio 4.5:1 required (WCAG AA) — always check red on blue combinations

---

## 3. Typography

### Headlines & Titles — Gotham Rounded Bold
- Preferred weight: **Bold**; secondary: Medium, Light
- All-caps acceptable for short display headlines
- Web substitute (if licensed font unavailable): **Nunito** (Google Fonts, closest rounded match)

### Body Copy — Myriad Pro Regular
- Preferred for paragraphs, menu copy, condensed info blocks
- All weights and italic variants permitted
- Web substitute: **Source Sans 3** or **Open Sans** (Google Fonts)

### Supporting Design Text — Phosphate Inline
- All-caps only (no lowercase characters)
- Use for headlines, titles, and element callouts **only** — never full body copy
- Creates excitement and visual flair; best at large display sizes
- Web use: treat as a display/hero-only font; load selectively

### Specialized Use — Luna Bar Regular
- Handscript style; use sparingly
- Only short statements or single words (not legible at body size)
- Good for: chalkboard-style callouts, message walls, seasonal promo graphics

---

## 4. Logo System

### Available Formats
| Format | Best Use |
|---|---|
| Horizontal | Website header, email headers, wide banners |
| Stacked | Square social avatars, app icons, square print |
| Vertical | Tall banners, flags, narrow contexts |
| Ice Cream Icon | Standalone icon use, favicon, app icon |
| Text Only | Only when the icon appears separately on the same page/wall |

### Color Variations
- **Full color** — default; use on white or light neutral backgrounds
- **One color** — use on single-color backgrounds where full color prints poorly
- **One color reversed (white)** — use on dark or branded color backgrounds

### Logo Don'ts
- Do not stretch, recolor, or rearrange elements
- Do not use text-only format unless the icon is present elsewhere on the same surface
- Do not place full-color logo on busy photography without a clean backing

---

## 5. Brand Icons (Supporting Cast)

Each icon has full color, one color, and reversed variants. Use separately or together to tell the brand story. These support — never replace — the primary logo.

| Icon | Name | Caption | Meaning |
|---|---|---|---|
| Atom/N | **N7** | "liquid nitrogen" | The science of freshness |
| Ice Cream | **Ice Cream** | "makes it fresh" | Premium cold treat |
| Spoon | **Atomic Spoon** | "dig in" | Science you can eat |
| Flask | **Beaker** | "customize it" | Mad-scientist customization |
| Goggles | **Goggles** | "super cool" | The tools of nitrogen craft |

---

## 6. Design Elements

### Vapor Clouds
- The most recognizable brand visual; appears on cups, decor, awnings, umbrellas
- **Preferred use**: white semi-transparent form over light blue (`#C7E8F3` or `#009CDE`) background
- Also available: flat white form; flat light blue form
- On the web: SVG or CSS shapes work well; consider subtle CSS animation for hero sections

### Message Wall Molecule
- Science-inspired typography display element; featured in every store
- Copy example: *"-321° is super cold! It's how we make every cold treat the creamiest and best tasting experience on Earth! …3-2-1- NITRO!"*
- Good for website "About/Story" or "How It Works" sections

### Science Word Storm
- Seamless repeating pattern of science vocabulary
- Use as wallpaper/texture: section backgrounds, table coverings, napkins, digital overlays
- On the web: great as a subtle CSS `background-repeat` pattern on light-colored sections

---

## 7. Web Layout Patterns

### subzeroicecream.com — Main Brand Site
- **Audience**: Direct consumers, prospective franchisees, catering inquiries
- **Tone**: Fun, energetic, science-smart, inclusive
- Expected structure:
  - Full-width hero with vapor clouds, bold headline, primary CTA
  - "How It Works" section (nitrogen process, icons)
  - Flavor/Sensation showcase (visual-heavy, color-forward)
  - Catering callout section
  - Franchising callout section
  - Social proof / locations

### subzerocatering.com — Catering-Focused Site
- **Audience**: Event planners, corporate clients, wedding/party hosts
- **Tone**: Professional yet exciting; emphasizes the "entertainment" angle
- Expected structure:
  - Hero emphasizing the experience ("dessert as entertainment")
  - Service packages / event types
  - Process / what to expect
  - Dietary accommodations (dairy-free, gluten-free, vegan)
  - Inquiry / booking CTA
  - Photo gallery of events

---

## 8. Design Improvement Recommendations

### 8.1 Modernize the Brand for 2025+

The 2018 guide is a strong foundation but needs web-era updates:

- **Hero animation**: Animate vapor cloud SVGs with a gentle drift/pulse using CSS keyframes. This costs nothing in performance and immediately communicates the nitrogen magic.
- **Dark mode variant**: The navy-and-blue palette is a natural fit for a dark UI. A dark-mode version of the site feels premium, scientific, and on-brand — plus differentiates from competitors.
- **Gradient usage**: A `#009CDE → #2D2F92` horizontal or radial gradient is an easy upgrade from flat blue backgrounds and looks distinctly "sub zero cold."
- **Card components**: Flavor cards and event package cards should use rounded corners (matching Gotham Rounded's personality) and subtle box shadows over white/light blue backgrounds.

### 8.2 Typography Web Stack

Gotham Rounded requires a commercial license for web use. Options:

1. **License Gotham Rounded via Fonts.com or Hoefler&Co** — cleanest, most on-brand
2. **Google Fonts fallback stack**: `'Nunito', 'Varela Round', sans-serif` — very close visual match, zero cost, fast CDN
3. Myriad Pro → `'Source Sans 3'` or `'Open Sans'` as body fallback

### 8.3 Imagery Style

- Apply a **cool blue color grade** (slight blue/cyan tint, raised shadows) to all hero photography for brand consistency
- Show the **nitrogen vapor cloud in every hero** if possible — it's the strongest differentiator
- For the catering site, use **event/crowd** photography over product shots to emphasize experience
- Avoid stock images that look generic; the nitrogen process is photogenic — lean into real location/action shots

### 8.4 CTAs and Conversion

- **Primary CTA** (`#9B1B30` red) should be used for 1 CTA per section maximum — scarcity makes it powerful
- Catering site needs a **sticky "Book Your Event" CTA** in the header on mobile
- Add **social proof numbers** prominently: "1 trillion+ combinations", "34+ locations", "Since 2004"
- The catering inquiry form should be 3 fields max above the fold (Name, Email, Event Date) with more fields revealed progressively

### 8.5 Accessibility

- The `#9B1B30` red on `#009CDE` blue fails WCAG AA — never layer these directly
- Ensure all vapor cloud imagery has appropriate `alt=""` (decorative) attributes
- Phosphate Inline at small sizes is hard to read — enforce a minimum 24px floor

---

## 9. SEO Recommendations

### 9.1 Core Keyword Strategy

| Page | Primary Keyword | Secondary Keywords |
|---|---|---|
| Home | `liquid nitrogen ice cream` | `nitrogen ice cream near me`, `custom ice cream` |
| Menu | `ice cream flavors` | `dairy-free ice cream`, `vegan frozen dessert` |
| Catering | `ice cream catering [city]` | `liquid nitrogen catering`, `dessert entertainment events` |
| Locations | `sub zero ice cream [city]` | `nitrogen ice cream [city]`, `ice cream shop [city]` |
| Franchising | `ice cream franchise opportunity` | `nitrogen ice cream franchise`, `dessert franchise 2025` |
| Our Story | `sub zero ice cream history` | `jerry hancock ice cream`, `liquid nitrogen ice cream inventor` |

### 9.2 Technical SEO

- **Title tags**: Format as `[Page Topic] | Sub Zero Nitrogen Ice Cream` — keep under 60 chars
- **Meta descriptions**: Lead with the USP — "Flash-frozen to order at -321° with liquid nitrogen. [page-specific hook]. [location/CTA]." Under 155 chars.
- **Canonical URLs**: Ensure franchise location pages don't duplicate the main domain's content
- **Core Web Vitals**: Vapor cloud imagery and hero photos are likely LCP culprits — use `loading="eager"` + `fetchpriority="high"` on hero images; lazy-load everything below the fold
- **Schema markup**:
  - `IceCreamShop` (sub-type of `FoodEstablishment`) on all location pages
  - `FAQPage` schema on catering and franchising pages
  - `Event` schema for in-store demos or school programs
  - `LocalBusiness` with NAP consistency across all location pages

### 9.3 Content SEO

- **"How It Works" content** ranks for informational queries like "how is liquid nitrogen ice cream made" — this page is high-value and likely under-optimized
- **Blog/science content**: Posts like "Why Liquid Nitrogen Makes Creamier Ice Cream" and "The Science Behind -321°F Ice Cream" earn links from food science and parenting blogs
- **Flavor pages**: Each named "Sensation" should have its own URL with a short description — thin content here is a missed opportunity for long-tail flavor searches
- **Catering landing pages**: Create city-specific pages for top catering markets — `subzerocatering.com/catering/salt-lake-city` etc.

### 9.4 Local SEO (per location)

- Every franchise location needs a **dedicated page** with: address, phone, hours, embedded Google Map, location-specific photos, and local schema
- **Google Business Profile** for each location must be claimed, verified, and populated with the same NAP data as the website
- Encourage post-visit reviews with a QR code in-store pointing to the GBP review link
- Consistent citations across Yelp, TripAdvisor, and local directories — NAP must match exactly

### 9.5 subzerocatering.com Specific

- The catering domain has separate SEO authority — build it independently
- Target event-planner search intent: "unique dessert catering ideas", "liquid nitrogen ice cream for weddings", "corporate event ice cream bar"
- Add testimonials with schema (`Review`) and event photos with descriptive file names (`nitrogen-ice-cream-wedding-catering-utah.jpg`)
- A **"Request a Quote" landing page** with its own meta/title targeting "ice cream catering quote" will outperform a generic contact page

---

## 10. Quick Reference Cheatsheet

```
Brand voice:    Fun · Scientific · Celebratory · Inclusive
Primary font:   Gotham Rounded Bold (web: Nunito)
Body font:      Myriad Pro Regular (web: Source Sans 3)
Display font:   Phosphate Inline (all-caps headlines only)
Script font:    Luna Bar Regular (sparingly, short phrases)

Primary red:    #9B1B30  (Pantone 7621 C)
Primary blue:   #009CDE  (Pantone 299 C)
Navy:           #2D2F92  (Pantone 2746 C)
Positive red:   #b50e1f  (Pantone 7421 C)
Powder blue:    #C7E8F3  (Pantone 2975 C)
Sky blue:       #71C5E8  (Pantone 297 C)

Key numbers:    -321°F · 1 trillion+ combos · Since 2004 · 34+ locations
Key icons:      N7 · Ice Cream · Atomic Spoon · Beaker · Goggles
Key element:    Vapor Clouds (white semi-transparent on blue)
```
