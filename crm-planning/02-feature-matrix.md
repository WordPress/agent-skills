# Feature Matrix: Overlaps & Priorities

This document maps all features across the three verticals and identifies what's shared, what's unique, and what's critical for MVP.

---

## Legend

- 🟢 **Shared** — Used by 2+ verticals (build once, configure per vertical)
- 🔵 **Vertical-Specific** — Used by one vertical only (independent implementation)
- ⭐ **MVP Critical** — Required to launch this vertical
- 📌 **High Priority** — Needed in first 6 months
- ❓ **Depends on Decisions** — Needs business clarification first

---

## Core Platform Features (Shared Foundation)

| Feature | Franchise | Catering | Events | Priority | Status |
|---------|-----------|----------|--------|----------|--------|
| User authentication & roles | 🟢 ⭐ | 🟢 ⭐ | 🟢 ⭐ | MVP | TBD |
| Contact/Party management | 🟢 ⭐ | 🟢 ⭐ | 🟢 ⭐ | MVP | TBD |
| Organization hierarchy (teams, permissions) | 🟢 ⭐ | 🟢 ⭐ | 🟢 ⭐ | MVP | TBD |
| Dashboard/home page (role-based views) | 🟢 ⭐ | 🟢 ⭐ | 🟢 ⭐ | MVP | TBD |
| Calendar (shared event planning) | 🟢 📌 | 🟢 📌 | 🟢 ⭐ | MVP | TBD |
| Notifications & alerts (in-app, email, SMS) | 🟢 📌 | 🟢 📌 | 🟢 ⭐ | MVP | TBD |
| Email templating & sending | 🟢 📌 | 🟢 ⭐ | 🟢 ⭐ | MVP | TBD |
| Mobile-responsive UI (web app) | 🟢 ⭐ | 🟢 ⭐ | 🟢 ⭐ | MVP | TBD |
| API for 3rd-party integrations | 🟢 📌 | 🟢 📌 | 🟢 📌 | MVP | TBD |
| Audit logs & compliance tracking | 🟢 ⭐ | 🟢 📌 | 🟢 📌 | 6 months | TBD |
| Advanced search & filtering | 🟢 📌 | 🟢 📌 | 🟢 📌 | 6 months | TBD |
| Reporting & export (CSV, PDF) | 🟢 ⭐ | 🟢 ⭐ | 🟢 📌 | MVP | TBD |
| Activity timeline/history | 🟢 📌 | 🟢 📌 | 🟢 📌 | 6 months | TBD |

---

## Franchise-Specific Features

| Feature | MVP? | Description | Notes |
|---------|------|-------------|-------|
| 🔵 **Franchisee Directory** | ⭐ | List all franchisees, searchable by territory, status, performance | Includes: contact info, territory, agreement expiry, health score |
| 🔵 **Territory Management** | ⭐ | Map-based territory assignment, conflict detection, expansion requests | Geo-boundaries, current owner, dispute log |
| 🔵 **Franchise Agreement Tracker** | ⭐ | Manage agreement versions, signature status, renewal dates, compliance | E-signature integration (DocuSign), version history |
| 🔵 **Unit Performance Dashboard** | ⭐ | Sales, ACV, customer count, employee count, scorecard KPIs | Monthly rollups, YoY comparisons, trend arrows |
| 🔵 **Royalty Calculation & Tracking** | ⭐ | Calculate royalties (% of sales), auto-invoice, track payments | If POS integrated, pull sales automatically |
| 🔵 **Compliance Reporting** | ⭐ | Franchisee submits reports (monthly, quarterly); franchisor reviews | E.g., "Are you following brand standards?" |
| 🔵 **Performance Leaderboard** | 📌 | Rank franchisees by revenue, growth, customer satisfaction | Anonymized peer benchmarking |
| 🔵 **Renewal Pipeline** | 📌 | Track agreements expiring in next 12 months, renewal status | Alerts, renewal prep workflows |
| 🔵 **Support Ticketing** | 📌 | Franchisee submits support request → franchisor responds | Priority routing (compliance vs. operations vs. marketing) |
| 🔵 **Training & Onboarding** | 📌 | Video playbooks, completion tracking, certification | Mandatory modules (brand standards, operations) |
| 🔵 **Staff Management** (franchisee location) | 📌 | Staff directory, roles, onboarding, shift scheduling | Shared with catering/events if multi-concept |

---

## Catering-Specific Features

| Feature | MVP? | Description | Notes |
|---------|------|-------------|-------|
| 🔵 **Lead Capture & Qualification** | ⭐ | Web form, phone, email → intake system → sales pipeline | Inquiry → quote → negotiation → booked |
| 🔵 **Proposal Generation** | ⭐ | Template-based proposals (menu, pricing, timeline) → branded PDF | Auto-calculate costs, margin estimates |
| 🔵 **Event Calendar** | ⭐ | View all catering events (booked), date, headcount, menu, status | Color-coded by status (inquiry, booked, in-progress, completed) |
| 🔵 **Menu Library** | ⭐ | Dishes, ingredients, pricing, seasonal rotation, dietary options | Ingredient component tracking (for costing) |
| 🔵 **Kitchen Prep List** | ⭐ | Generated from booked events, shows what to prep, timeline | Ingredients to order, tasks, responsible person |
| 🔵 **Ingredient Inventory** | ⭐ | Par levels, current stock, vendor info, lead times, reorder alerts | Expiry date tracking, shortage alerts |
| 🔵 **Team Scheduling** | 📌 | Assign staff to events, shift coverage, conflict detection | Integration with shared staff management |
| 🔵 **Equipment Tracking** | 📌 | Owned equipment (dishes, linens, heating), assignment to events | Maintenance log, availability status |
| 🔵 **Cost Tracking** | 📌 | Actual COGS per event, labor, delivery vs. estimated | Margin per event, trend analysis |
| 🔵 **Invoicing & Payment** | ⭐ | Create invoice from event, send to customer, track payment | Online payment collection (Stripe) |
| 🔵 **Customer Portal** | 📌 | Event organizer views proposal, approves menu, pays online | Read-only portal, minimal friction |
| 🔵 **Vendor Management** | 📌 | Vendor list, lead times, pricing, auto-ordering capability | Depends: will you auto-order or franchisees order independently? |
| 🔵 **Delivery Routing** | 📌 | Multi-stop route optimization, time windows, driver assignments | Optional: depends on whether you do delivery |
| 🔵 **Upsell Tracking** | 📌 | Premium items, wine, desserts added during negotiation | Margin impact, per-customer spending trend |
| 🔵 **Capacity Planning** | 📌 | Kitchen % utilization, prep timeline conflicts, team availability | Flags when you're overbooked |

---

## Event Booking-Specific Features

| Feature | MVP? | Description | Notes |
|---------|------|-------------|-------|
| 🔵 **Event Creation Wizard** | ⭐ | Organizer creates event (date, time, capacity, ticket price, story) | Simple UI, 3-5 questions, location = your store (pre-filled) |
| 🔵 **Event Page & Customization** | ⭐ | Branded event page, images, description, ticket options | Responsive, mobile-friendly, social-shareable |
| 🔵 **Ticket Sales** | ⭐ | Online ticket purchasing, Stripe integration, real-time inventory | Multiple ticket tiers (standard, VIP, group discounts) |
| 🔵 **Ticket Tiers & Pricing Rules** | 📌 | Standard, VIP, group discounts, early bird, dynamic pricing | Organizer can customize per event |
| 🔵 **Email Reminders** | ⭐ | Templated emails to organizer & attendees (1 week, 3 days, 1 day out) | Engagement tracking (opens, clicks) |
| 🔵 **Attendee List** | ⭐ | Who bought tickets, name, email, ticket type, purchase date | Downloadable CSV for check-in |
| 🔵 **Mobile Check-In** | 📌 | Scan QR code at event, mark attendance, verify ticket status | Web or mobile app, offline-capable |
| 🔵 **Revenue Dashboard** | ⭐ | Organizer sees: tickets sold, revenue, commission split | Real-time updates, simple KPIs |
| 🔵 **Capacity Alerts** | 📌 | Warn organizer & store when event reaches 80%, 90%, sold out | Prevent overbooking, manage expectations |
| 🔵 **Mobile Ticket (QR Code)** | 📌 | Attendee receives QR code via email, can add to Apple/Google Wallet | Reduces friction, looks professional |
| 🔵 **Refund Handling** | ⭐ | Cancel ticket, initiate refund, track refund status | Policy: full, partial, or non-refundable by event type |
| 🔵 **Multi-Ticket Bulk Purchase** | 📌 | Groups can buy 10+ tickets at once, group discount | Simplify group organizer workflow |
| 🔵 **Donation Option** | 📌 | Attendees add tip/donation at checkout | Benefits organizer, reduces friction |
| 🔵 **Organizer Email Campaigns** | 📌 | Send emails to attendees pre/post event (marketing) | Organizer responsibility, your platform enables |
| 🔵 **POS Integration** | 📌 | Link in-store sales to specific events (revenue attribution) | See how much attendees spent during/after event |
| 🔵 **Sponsorship Tiers** | ❓ | Premium sponsors get logo/benefits on event page | Depends: will you offer? Too much scope for MVP? |

---

## Integrations by Vertical

### Shared Integrations
- **Email** (SendGrid, Mailgun, AWS SES) — all verticals send templated emails
- **Payment** (Stripe, PayPal) — royalties, invoices, event tickets
- **Authentication** (OAuth via Google, Microsoft, or custom) — single sign-on
- **Logging & Analytics** (Datadog, Sentry) — error tracking, performance monitoring

### Franchise-Specific Integrations
- **POS** (Square, Toast, Shopify) → auto-pull sales for royalty calculation
- **E-signature** (DocuSign, HelloSign) → franchise agreement signing
- **Mapping** (Google Maps, Mapbox) → territory visualization
- **Slack/Teams** → alerts for compliance issues

### Catering-Specific Integrations
- **Email marketing** (Mailchimp, Klaviyo) → customer campaigns
- **Vendor APIs** (if available) → ingredient ordering, pricing
- **Google Maps/Routes API** → delivery optimization
- **Accounting** (QuickBooks, Xero) → expense sync
- **POS** → tie event to in-store sales (optional)

### Event Booking-Specific Integrations
- **Email marketing** (SendGrid for bulk campaigns)
- **SMS** (Twilio) → last-minute reminders
- **Mobile wallet** (Apple Wallet, Google Pay) → ticket delivery
- **Social media** (Facebook pixel) → share tracking, ads
- **POS** (Square, Toast) → revenue attribution to events

---

## MVP Feature Sets by Vertical

### Franchise Systems MVP (Minimum Viable Product)
**Ship**: User auth → Franchisee directory → Territory map → Performance dashboard → Compliance reporting → Royalty tracking

**Must Have**:
1. Franchisee CRUD (create, read, update, delete) with basic fields
2. Territory assignment (map view, boundaries, current owner)
3. Monthly performance metrics (sales, customer count, scorecard)
4. Compliance checklist (franchisee submits, franchisor reviews)
5. Royalty calculation (% of reported sales or auto-pulled from POS if integrated)
6. Email notifications (compliance reminders, performance alerts)
7. Franchisee portal (view their unit dashboard)

**Timeline**: 8-12 weeks (assuming 1-2 engineers)  
**Success Metric**: 10+ franchisees onboarded, royalty payments tracked & collected

---

### Catering MVP
**Ship**: Lead capture → Proposal generation → Event calendar → Kitchen prep list → Invoicing

**Must Have**:
1. Lead intake (web form or manual entry)
2. Proposal builder (select menu, auto-price, send as PDF)
3. Event confirmation (booked events show on calendar)
4. Kitchen prep list (auto-generated from menu, timeline)
5. Ingredient inventory (par levels, reorder alerts)
6. Invoice generation & email to customer
7. Payment tracking (mark as paid)

**Timeline**: 10-14 weeks (assuming 2 engineers)  
**Success Metric**: 5+ events booked/month, margin >30%

---

### Event Booking MVP
**Ship**: Event creation → Event page & ticket sales → Attendee list → Check-in → Revenue dashboard

**Must Have**:
1. Event wizard (organizer creates event in <5 min)
2. Event page (responsive, branded, shareable)
3. Ticket sales (Stripe integration, real-time inventory)
4. Email reminders (to organizer & attendees)
5. Attendee CSV export (for check-in)
6. Mobile check-in (web-based, scan QR code)
7. Revenue dashboard (organizer sees sales & commission)
8. Refund handling (cancel ticket, issue refund)

**Timeline**: 6-8 weeks (assuming 1-2 engineers, high code reuse from platform foundation)  
**Success Metric**: 5+ events/month, 1,000+ tickets/month, <2% refund rate

---

## Feature Dependency Graph

```
Core Platform (Week 1-2)
├─ User authentication
├─ Contact/party management
├─ Organization hierarchy & roles
├─ Email templating
└─ Notification system

Then (in parallel):

Franchise Branch (Week 3-12)
├─ Franchisee CRUD
├─ Territory management
├─ Performance dashboard
├─ Compliance tracking
├─ Royalty calculation
└─ Franchisee portal

Catering Branch (Week 3-14)
├─ Lead capture
├─ Proposal generation (menu library required first)
├─ Menu library
├─ Event calendar
├─ Kitchen prep list
├─ Inventory management
└─ Invoicing

Event Booking Branch (Week 3-8)
├─ Event creation
├─ Event page & customization
├─ Ticket sales
├─ Attendee management
├─ Check-in workflow
└─ Revenue dashboard
```

---

## Open Questions (Blocking Design Decisions)

1. **Multi-Concept?** Can a franchisee run catering + events at the same location?
   - Answer determines: shared calendar, shared staff management, shared inventory
   
2. **White-Label?** Do franchisees get their own branded portals?
   - Answer determines: tenant isolation level, subdomain strategy
   
3. **POS Integration Priority?** Is auto-pulling sales from Square/Toast critical for MVP?
   - Answer determines: whether franchisee self-reports or system auto-syncs
   
4. **Vendor Auto-Ordering?** Will catering auto-order from suppliers or does franchisee order manually?
   - Answer determines: API integrations required, inventory complexity
   
5. **Commission Structure?** How do you take your cut from events?
   - Answer determines: invoice & payment reconciliation logic
   
6. **Geographic Scope?** Single location, multi-location, multi-state?
   - Answer determines: compliance, tax, data residency requirements
   
7. **Franchisee Tech Level?** Are they Google-Forms comfortable or fully digital native?
   - Answer determines: UI complexity, training burden
   
8. **Support Model?** Self-serve (docs) or hands-on (onboarding calls)?
   - Answer determines: onboarding module scope
