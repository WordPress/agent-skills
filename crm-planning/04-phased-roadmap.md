# Phased Roadmap & Timeline

---

## Overview

This document defines the MVP scope, phased releases, timeline, and go-to-market strategy for the multi-vertical CRM.

**Key Principle**: Ship one vertical to market, validate with real users, then add the second and third. This reduces scope creep and lets you iterate on core platform features.

---

## Vertical Launch Order Recommendation

### Tier 1: Event Booking (Ship First - Fastest MVP)
**Why**:
- Smallest feature set (event creation → ticket sales → check-in → revenue)
- Shortest sales cycle (events happen in weeks, not years)
- Highest customer acquisition velocity (nonprofits, schools, community groups)
- Clearest ROI (commission per ticket, simple math)
- Reusable code for catering (contact management, calendar, email, invoicing)

**Timeline**: 6-8 weeks to MVP  
**Success Metrics**: 5+ events/month, $5k+ monthly commission

---

### Tier 2: Catering (Ship Second - High Margin)
**Why**:
- Reuses event booking foundation (calendar, contacts, email, notifications)
- Higher margins than events (30%+ vs. 10% commission)
- Established customer base (existing store relationships)
- Supports upselling to event customers (add catering to fundraiser)

**Timeline**: 10-14 weeks (6-8 weeks after event booking ships)  
**Success Metrics**: 5-10 events/month, $10k+ monthly revenue

---

### Tier 3: Franchise Systems (Ship Third - Long-term Revenue)
**Why**:
- Most complex (territories, compliance, long-term contracts)
- Longest sales cycle (weeks to close franchisee, years of relationship)
- Highest lifetime value (recurring royalties forever)
- Can leverage platform stability from first two verticals

**Timeline**: 12-16 weeks (later, after catering ships)  
**Success Metrics**: 1-2 franchisees, $2k-5k monthly royalties

---

## Timeline & Phases

### Phase 0: Foundation (Weeks 1-2)
**What**: Core platform, dev environment, CI/CD pipeline, architectural setup

**Tasks**:
- [ ] Repository setup (Turbo monorepo: `/packages/api`, `/packages/frontend`, `/packages/core`)
- [ ] Docker Compose setup (postgres:16, redis:7, app, frontend, migrate service)
- [ ] Database schema creation using **Drizzle** (all 3 verticals, with constraints)
  - [ ] Create `packages/api/drizzle/schema.ts`
  - [ ] Auto-generate migrations: `pnpm db:generate`
  - [ ] Create `docker-migrate.sh` (like SeldonFrame)
- [ ] Event registry system (EventEmitter + event schema registry)
  - [ ] TypeScript event types auto-generation script
  - [ ] Emit/subscribe patterns documented
- [ ] Blocks directory structure
  - [ ] `/packages/api/src/blocks/shared/` (auth, contacts, calendar)
  - [ ] `/packages/api/src/blocks/events/` (stubbed for Phase 1)
  - [ ] `/packages/api/src/blocks/catering/` (stubbed for Phase 2)
  - [ ] `/packages/api/src/blocks/franchise/` (stubbed for Phase 3)
- [ ] User auth system (JWT, session management via Redis)
- [ ] Organization & permission system (franchisee, staff, organizer roles)
- [ ] API router structure (Express, organized by block)
- [ ] Deployment pipeline (GitHub Actions → Fly.io or Railway)
- [ ] Email templating system (SendGrid integration)
- [ ] Notification system (in-app, email, SMS via SendGrid)
- [ ] Logging & error tracking (Sentry)
- [ ] Testing setup (Jest + Playwright configured, first smoke tests)

**Deliverables**:
- Deployed staging environment (cloud + docker-compose locally)
- Admin dashboard (user management, org management)
- Basic API endpoints for auth & org management
- Blocks system skeleton with event registry working
- Docker Compose runs cleanly: `docker compose up` → app at localhost:3000

**Team**: 1 full-stack engineer + 0.5 DevOps (or 1 senior doing both)

---

### Phase 1A: Event Booking MVP (Weeks 3-10)

#### Week 3-4: Event Creation & Page
**Tasks**:
- [ ] Event model & database schema (dates, capacity, custom fields)
- [ ] Event creation form (organizer creates event in <5 min)
- [ ] Event page builder (drag-and-drop customization, branding)
- [ ] Event page frontend (public, responsive, shareable)
- [ ] Email template for event confirmation & sharing

**Deliverables**: Organizers can create events and see live event pages

#### Week 5-6: Ticket Sales
**Tasks**:
- [ ] Ticket tier model (standard, VIP, group discount)
- [ ] Ticket inventory management (cap per tier, real-time count)
- [ ] Stripe integration for online payment
- [ ] Ticket purchase flow (email capture, payment, confirmation)
- [ ] Email confirmation with QR code/ticket details

**Deliverables**: Attendees can buy tickets, you receive payment via Stripe

#### Week 7-8: Attendee Management & Check-In
**Tasks**:
- [ ] Attendee list tracking (who bought, when, which tier)
- [ ] CSV export for check-in
- [ ] Mobile check-in app (scan QR code, mark attendance)
- [ ] Check-in logging (verify tickets, prevent double-scan)

**Deliverables**: You can check in attendees at the event

#### Week 9-10: Dashboards & Launch
**Tasks**:
- [ ] Organizer dashboard (real-time ticket sales, attendee count, revenue)
- [ ] Your (platform owner) dashboard (events, total revenue, commission)
- [ ] Email reminders (1 week, 3 days, 1 day before event)
- [ ] Refund handling (cancel ticket, initiate refund)
- [ ] Analytics (open rates on reminder emails, conversion funnel)
- [ ] Documentation & onboarding (how to create event, how to check in)

**Deliverables**: MVP ready for public launch

**Team**: 1-2 frontend engineers + 1 backend engineer

**Success Metrics to Track**:
- Time to create an event (goal: <5 min)
- Ticket purchase conversion (goal: >15% of event page visitors buy)
- Check-in success rate (goal: >95% of tickets checked in without errors)
- Customer satisfaction (goal: >4.0/5.0 rating)

---

### Phase 1B: Event Booking Polish & Growth (Weeks 11-14)

**Tasks**:
- [ ] Sponsorship tiers (premium sponsors get logo on event page)
- [ ] Merchandise/add-on sales (t-shirts, programs, etc.)
- [ ] Bulk ticket purchase (groups buying 10+ tickets)
- [ ] Donation option (attendees add tip at checkout)
- [ ] Email marketing tools for organizers (campaign templates)
- [ ] Mobile ticket (Apple Wallet, Google Pay integration)
- [ ] POS integration (Square, Toast) for revenue attribution
- [ ] Customer feedback & improvements from first 20 events

**Deliverables**: Enhanced event booking, ready for press/launch

**Marketing Activities**:
- [ ] Blog post: "How to host a fundraiser at your store in 5 minutes"
- [ ] Case study: First event organizer success story
- [ ] Email to local nonprofits/schools (launch announcement)
- [ ] Social media campaign

---

### Phase 2A: Catering MVP (Weeks 15-28)

#### Week 15-17: Lead Capture & Proposal
**Tasks**:
- [ ] Lead model (inbound inquiry → sales pipeline)
- [ ] Lead intake form (web form, CRM entry)
- [ ] Proposal template builder (menus, pricing, timeline)
- [ ] Menu library (dishes, ingredient components, costing)
- [ ] Auto-pricing (select menu → total price calculated)
- [ ] Proposal PDF generation (branded, sendable)
- [ ] Lead tracking dashboard (inquiry → quoted → booked)

**Deliverables**: Sales can take inbound inquiries and send proposals

#### Week 18-21: Event Calendar & Prep
**Tasks**:
- [ ] Catering event model (booked events calendar)
- [ ] Kitchen prep list (auto-generated from menu, timeline)
- [ ] Ingredient inventory (par levels, current stock, reorder alerts)
- [ ] Ingredient tracking (what you need to buy for each event)
- [ ] Vendor management (list of suppliers, lead times)
- [ ] Team scheduling (assign staff to events, conflict detection)
- [ ] Equipment inventory (dishes, linens, heating, assignment)

**Deliverables**: Operations can see prep list, order ingredients, assign team

#### Week 22-24: Invoicing & Cost Tracking
**Tasks**:
- [ ] Actual cost tracking (ingredients used, labor, delivery)
- [ ] Cost vs. estimate comparison (margin per event)
- [ ] Invoice generation & email to customer
- [ ] Online payment collection (Stripe, customer portal)
- [ ] Payment tracking & reconciliation

**Deliverables**: You can invoice customers, track payments and margins

#### Week 25-28: Dashboards & Polish
**Tasks**:
- [ ] Sales dashboard (proposals, close rate, pipeline)
- [ ] Operations dashboard (calendar, prep timeline, utilization)
- [ ] Financial dashboard (revenue, COGS, margin per event, YTD)
- [ ] Customer portal (organizer views proposal, approves menu, pays online)
- [ ] Email templates (proposal, event confirmation, invoice, thank you)
- [ ] Documentation & training

**Deliverables**: Catering MVP ready for use with real customers

**Team**: 1-2 backend engineers + 1 frontend engineer (can overlap with event booking team)

**Success Metrics to Track**:
- Proposal-to-booking rate (goal: >25%)
- Average event margin (goal: 30%+)
- Time to invoice (goal: <1 day after event)
- Kitchen prep accuracy (goal: 95%+ of prep list completed on-time)

---

### Phase 2B: Catering Growth (Weeks 29-36)

**Tasks**:
- [ ] Delivery routing & optimization (multi-stop routing)
- [ ] Seasonal forecasting (predict Q4 volume, resource planning)
- [ ] Customer portal enhancements (better UX, self-service)
- [ ] Vendor auto-ordering (API integration with suppliers)
- [ ] Staff timesheets & payroll integration
- [ ] Performance analytics (repeat customers, referral sources, seasonal trends)
- [ ] Upsell management (premium items, wine, desserts)

---

### Phase 3A: Franchise Systems MVP (Weeks 37-52)

#### Week 37-40: Franchisee Management
**Tasks**:
- [ ] Franchisee onboarding workflow (application → approval → setup)
- [ ] Franchisee directory (searchable, filterable by territory, performance, status)
- [ ] Franchise agreement tracking (versions, signature status, renewal dates)
- [ ] E-signature integration (DocuSign or HelloSign)
- [ ] Territory management (map view, boundaries, current owner)
- [ ] Franchisee performance dashboard (KPIs, scorecard)

**Deliverables**: You can onboard franchisees and track agreements

#### Week 41-44: Metrics & Royalties
**Tasks**:
- [ ] Franchisee metrics model (monthly: sales, ACV, customer count, employee count)
- [ ] Performance scorecard (5-10 KPIs, health rating)
- [ ] POS integration (auto-pull sales if integrated)
- [ ] Royalty calculation (% of sales, auto-invoice)
- [ ] Payment tracking & reconciliation
- [ ] Royalty dashboard (franchisee view of what they owe)

**Deliverables**: Automate royalty tracking & collection

#### Week 45-48: Compliance & Support
**Tasks**:
- [ ] Compliance reporting (franchisee submits monthly/quarterly reports)
- [ ] Support ticketing system (franchisee → franchisor support)
- [ ] Escalation workflows (compliance issue → franchisor alert)
- [ ] Notification system (royalty due, compliance report overdue, performance warning)

**Deliverables**: Franchisees can submit reports, franchisor manages compliance

#### Week 49-52: Dashboards & Launch
**Tasks**:
- [ ] Franchisor dashboard (unit overview, performance, compliance, royalty health)
- [ ] Franchisee portal (their unit metrics, agreements, support tickets)
- [ ] Reporting suite (performance by region, renewal pipeline, churn risk)
- [ ] Documentation & franchisee training program
- [ ] Franchisee onboarding materials (playbooks, video tutorials)

**Deliverables**: Franchise MVP ready for first franchisees

**Team**: 1-2 backend engineers + 1 frontend engineer

**Success Metrics to Track**:
- Time to onboard franchisee (goal: <1 week from application to setup)
- Franchisee adoption (goal: 80%+ logging in weekly)
- Royalty collection rate (goal: 95%+ on-time payment)
- Compliance report submission rate (goal: 90%+ submit by deadline)

---

### Phase 3B: Franchise Growth (Weeks 53-64)

**Tasks**:
- [ ] Performance forecasting (trend analysis, churn prediction)
- [ ] Peer benchmarking (compare unit to similar units)
- [ ] Territory expansion workflows (franchisee request → franchisor approval)
- [ ] Dispute resolution (territory conflicts, agreement violations)
- [ ] Training & certification (video completion, assessments)
- [ ] Staff management (hire, train, performance tracking)

---

## Summary Timeline

| Phase | Vertical | Duration | Target Launch | Focus |
|-------|----------|----------|----------------|-------|
| 0 | Foundation | 2 weeks | Week 2 | Auth, DB, deployment |
| 1A | Event Booking | 8 weeks | Week 10 | MVP ready |
| 1B | Event Booking | 4 weeks | Week 14 | Polish, 20 events/month |
| 2A | Catering | 14 weeks | Week 28 | MVP ready |
| 2B | Catering | 8 weeks | Week 36 | 10+ events/month |
| 3A | Franchise | 16 weeks | Week 52 | MVP ready |
| 3B | Franchise | 12 weeks | Week 64 | 3+ franchisees |

**Total**: 64 weeks (≈15 months) to have all three verticals at mature MVP level

---

## Go-to-Market Strategy

### Phase 1: Event Booking Launch (Week 14)

**Target Customer**: Nonprofits, schools, community groups, PTA fundraisers  
**Message**: "Host a fundraiser at our store in 5 minutes. We handle ticketing, attendees, and check-in."

**Channels**:
- Direct email to local nonprofits/schools
- Social media (Instagram, Facebook)
- Blog post: "How to host a fundraiser"
- Partnership with local nonprofit networks
- Press release: "New fundraising platform launches"

**Success Target**: 5+ events in first month, $5k+ commission

---

### Phase 2: Catering Launch (Week 28)

**Target Customer**: Existing store customers, local event planners  
**Message**: "Catering made easy. From quote to invoice to check-in, all in one place."

**Channels**:
- Email to existing event booking customers (upsell: add catering)
- Direct to previous customers
- Local event planner directories
- Partnerships with venues, hotels
- Blog post: "Catering margin optimization"

**Success Target**: 5-10 events/month, $10k+ monthly revenue

---

### Phase 3: Franchise Launch (Week 52)

**Target Customer**: Entrepreneurs wanting to franchise your concept  
**Message**: "Complete franchisee management platform. Track units, compliance, and royalties."

**Channels**:
- Franchise broker networks
- Direct outreach to high-performing store operators
- Franchise show exhibits
- Blog post: "How to scale your concept with franchising"
- Case study: "How we grew from 1 to 5 units"

**Success Target**: 1-2 franchisees signed, $2k-5k monthly royalties

---

## Resource Plan

### Team Composition (Recommended)

**MVP Phase (Weeks 1-14, Event Booking)**:
- 1x Full-stack engineer (JavaScript, React, Node.js)
- 0.5x DevOps (GitHub Actions, Fly.io, database)
- 1x Product manager (you, likely)
- 0.5x Designer (UI/UX for organizer-facing portal)

**Growth Phase (Weeks 15-28, Catering)**:
- +1x Backend engineer (scale the API)
- +1x Frontend engineer (separate sales/ops/customer portals)

**Mature Phase (Weeks 29+, Franchise)**:
- +1x Backend engineer (complex metrics & reporting)
- 1x Support/onboarding specialist (franchisee training)

---

## Key Decision Points (Go/No-Go)

### After Phase 1A (Week 10): Can we launch Event Booking?
**Go criteria**:
- [ ] API responses <200ms
- [ ] Ticket purchase has >10% conversion
- [ ] No critical bugs found in testing
- [ ] At least 3 test events completed successfully

**No-go path**: Delay catering launch, iterate on event booking MVP

### After Phase 2A (Week 28): Can we launch Catering?
**Go criteria**:
- [ ] Proposal generation takes <5 minutes
- [ ] Prep list is accurate (95%+ of tasks completed on time)
- [ ] Margin tracking is accurate (actual COGS within 10% of estimate)
- [ ] At least 2 real catering events completed

**No-go path**: Delay franchise launch, iterate on catering MVP

### After Phase 3A (Week 52): Can we launch Franchise?
**Go criteria**:
- [ ] Onboarding takes <1 week per franchisee
- [ ] Royalty calculation is automated & accurate
- [ ] Compliance reports are submitted on time by test franchisees
- [ ] At least 2 test franchisees successfully using the system

**No-go path**: Keep focus on event booking & catering, revisit franchise Q1 next year

---

## Budget Estimate (12 months)

| Category | Cost | Notes |
|----------|------|-------|
| **Team (Contract/FTE)** | $200k-400k | 1-2 engineers for 12 months |
| **Hosting & Infrastructure** | $5k | Vercel, Fly.io, PostgreSQL, Redis |
| **Third-party Services** | $3k | SendGrid, Stripe, Sentry, Datadog |
| **Tools & Services** | $2k | GitHub Pro, design tools, monitoring |
| **Domain & SSL** | $500 | Domain name, SSL certificate |
| **Marketing & Launch** | $5k | Blog, ads, outreach |
| **Contingency (20%)** | $40k | Buffer for overruns |
| **TOTAL** | **$255k-455k** | ~$21-38k/month |

---

## Success Metrics (12-Month Target)

| Metric | Event Booking | Catering | Franchise |
|--------|---------------|----------|-----------|
| Monthly Events | 50+ | 15+ | 5+ |
| Monthly Revenue | $15k | $20k | $10k |
| Customer Satisfaction | 4.5/5 | 4.2/5 | 4.0/5 |
| Churn Rate | <5% | <10% | <5% |
| Active Users | 500+ | 50+ | 10+ |
| Team Size | 3-4 | 4-5 | 5-6 |

**Combined Target**: $45k+/month revenue, 3 verticals operational
