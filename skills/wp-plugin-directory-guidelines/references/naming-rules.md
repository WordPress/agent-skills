## Plugin Naming Rules (Guideline 17 + Plugin Check Namer)

Sources: [Plugin Header Requirements](https://developer.wordpress.org/plugins/plugin-basics/header-requirements/#header-fields) · [Detailed Plugin Guidelines §17](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/) · Plugin Check `Plugin_Header_Fields_Check`, `Trademarks_Check`, and AI Namer prompts.

### Technical Name Requirements

| Rule | Details | Error Code |
|------|---------|------------|
| Must not use placeholder names | `"Plugin Name"` or `"My Basics Plugin"` are rejected | `plugin_header_invalid_plugin_name` |
| Minimum 5 alphanumeric characters | Name must contain at least 5 latin letters (a–Z) or digits | `plugin_header_unsupported_plugin_name` (new plugins only) |
| Name must exist in readme | `=== Plugin Name ===` header required and must be valid | `invalid_plugin_name` / `empty_plugin_name` |
| Name must match across files | Readme and plugin header name must match (case/entity-decoded) | `mismatched_plugin_name` (warning) |

**Slug rules:** lowercase, hyphens only, max 50 characters, derived from display name.

### Naming Quality Rules (AI Namer)

**1. No generic names**
Names must be specific enough to distinguish the plugin from ~60,000 others.
- Rejected: "Shipping", "Ecommerce Tracker", "SEO Plugin"
- Accepted: "ShipGlex Shipping", "Shipping Tracker for UPS"
- Exception: invented/original terms are allowed if placed at the **beginning** of the name

**2. Name must relate to plugin function**
The display name must correlate with what the plugin actually does. Exception: original invented terms.

**3. No keyword stuffing**
Unnaturally repeating keywords in the name for SEO purposes is not allowed.

**4. No names too similar to existing plugins**
Checked against the WordPress.org Plugin Directory. If similar, suggest a distinctive term (author name, brand, or crafted term) at the beginning.

**5. Trademark/project name usage rules**
Trademarks and project names are allowed **only** after connectors like `for`, `with`, `using`, or `and`:
- ✅ `"My Plugin for WooCommerce"` — trademark after "for", no affiliation implied
- ✅ `"Pricing Rates for WooCommerce"` — OK
- ❌ `"WooCommerce Pricing Rates"` — starts with trademark, implies affiliation
- ❌ `"Nicedev Paypal for WooCommerce"` — PayPal is not after a no-affiliation structure; correct form: `"Nicedev Payment Gateway with PayPal for WooCommerce"`
- ❌ `"PricingPress"` — portmanteau using `-Press` (WordPress trademark)
- Check for portmanteaus: names blending a trademark (e.g., `-Press`, `Woo-`) are not allowed

**6. Banned and discouraged terms**

Banned/discouraged terms cannot appear **anywhere** in the name — not even after `for`/`with`.

#### Banned Terms (hard block)

| Term | Reason |
|------|--------|
| Facebook, FB, fbook, Whatsapp, WA, Instagram, Insta, Gram, INS, Threads, Oculus | Meta legal request: no use in name, slug, or banners |
| WordPress, wordpess, wpress | WordPress trademark; redundant in the WP.org directory |
| WP (as standalone/redundant, e.g., "for WP") | Same as WordPress — redundant in context |
| Trustpilot | Direct request from trademark holder |
| Binance Pay | Direct request from trademark holder |

#### Discouraged Terms (must be removed)

| Term | Reason |
|------|--------|
| plugin (when redundant, e.g., "SEO Plugin") | Redundant; forbidden as first word |
| best, #1, First, Perfect, The most | Superlatives / unverifiable comparative claims |
| free (when redundant, e.g., "(free)") | All directory plugins are free — redundant |
| WP, W P (at beginning or end, referring to WordPress) | WordPress abbreviation — redundant |
| Gutenberg, gberg, guten, berg | Creates confusion; block editor is the current name |

### Trademark Slug List (static check — `Trademarks_Check`)

The following slugs are statically blocked. Terms ending in `-` cannot **begin** a slug; terms without `-` cannot appear **anywhere** in the slug. `woocommerce` (no dash) is allowed only as `for-woocommerce`, `with-woocommerce`, `using-woocommerce`, or `and-woocommerce`.

```
adobe-, adsense-, advanced-custom-fields-, adwords-, akismet-,
all-in-one-wp-migration, amazon-, android-, apple-, applenews-, applepay-,
aws-, azon-, bbpress-, bing-, booking-com, bootstrap-, buddypress-,
chatgpt-, chat-gpt-, cloudflare-, contact-form-7-, cpanel-, disqus-, divi-,
dropbox-, easy-digital-downloads-, elementor-, envato-,
fbook, facebook, fb-, fb-messenger, fedex-, feedburner, firefox-,
fontawesome-, font-awesome-, ganalytics-, gberg, github-, givewp-, google-,
googlebot-, googles-, gravity-form-, gravity-forms-, gravityforms-, gtmetrix-,
gutenberg, guten-, hubspot-, ig-, insta-, instagram, internet-explorer-,
ios-, jetpack-, macintosh-, macos-, mailchimp-, microsoft-,
ninja-forms-, oculus, onlyfans-, only-fans-, opera-, paddle-, paypal-,
pinterest-, plugin, skype-, stripe-, tiktok-, tik-tok-, trustpilot,
twitch-, twitter-, tweet, ups-, usps-, vvhatsapp, vvcommerce, vva-, vvoo,
wa-, webpush-vn, wh4tsapps, whatsapp, whats-app, watson, windows-,
wocommerce, woocom-, woocommerce, woocomerce, woo-commerce, woo-, wo-,
wordpress, wordpess, wpress, wp, wc, wp-mail-smtp-, yandex-, yahoo-,
yoast, youtube-, you-tube-
```

**Portmanteaus also blocked:** any slug starting with `woo` (case-insensitive) — e.g., `woopress`, `wooland`.

### Naming Examples

| Plugin Name | Verdict | Reason |
|-------------|---------|--------|
| `Shipping` | ❌ | Too generic |
| `Ecommerce Tracker` | ❌ | Too generic, no context |
| `Shipping Tracker for UPS` | ✅ | Descriptive + context |
| `ShipGlex Shipping` | ✅ | Invented term at beginning |
| `WooCommerce Pricing Rates` | ❌ | Starts with trademark |
| `Pricing Rates for WooCommerce` | ✅ | Trademark after "for" |
| `PricingPress` | ❌ | `-Press` portmanteau |
| `PRT Text editor for WP` | ❌ | WP is banned/redundant; correct: `PRT Text editor` |
| `Nicedev Paypal for WooCommerce` | ❌ | PayPal not after no-affiliation structure |
| `Nicedev Payment Gateway with PayPal for WooCommerce` | ✅ | Correct structure |
| `Best SEO Plugin for WordPress` | ❌ | Superlative + banned terms |
| `My Free Slider` | ❌ | "free" is redundant/discouraged |

### Naming Review Checklist (pre-submission)

- [ ] Name is not a placeholder (`Plugin Name`, `My Basics Plugin`)
- [ ] Name has at least 5 alphanumeric characters
- [ ] Name matches between plugin header and readme
- [ ] Name is specific — not too generic for 60,000+ plugins
- [ ] Name relates to what the plugin actually does
- [ ] No keyword stuffing
- [ ] No banned terms anywhere (Meta brands, WordPress/WP redundant, Trustpilot, Binance Pay)
- [ ] No discouraged terms (Plugin, Best/#1, Free, Gutenberg, standalone WP)
- [ ] Trademarks/project names only appear after `for`/`with`/`using`/`and`
- [ ] No portmanteaus using WordPress or WooCommerce trademarks
- [ ] Slug is lowercase, hyphens only, max 50 chars, no blocked terms
