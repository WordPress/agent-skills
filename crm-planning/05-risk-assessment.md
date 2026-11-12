# Risk Assessment & Mitigation

---

## Overview

This document identifies known risks, challenges, and unknowns for each vertical, with mitigation strategies.

---

## Event Booking Risks

### Risk 1: Organizer Onboarding Friction
**Problem**: Organizers are busy (running nonprofits, schools). If event setup takes >10 minutes, they'll give up.  
**Impact**: Low adoption, high churn  
**Likelihood**: High

**Mitigation**:
- [ ] Pre-fill event location (your store address)
- [ ] Set reasonable defaults (time: 6pm, capacity: 200, price: $25)
- [ ] Mobile-first form (no long scrolls)
- [ ] Auto-detect what type of event from description (AI classification?)
- [ ] Offer phone onboarding for first-time users
- [ ] Track setup time in analytics, flag if >10 min

**Validation**: Beta test with 10 nonprofits before launch

---

### Risk 2: Payment Processing Issues
**Problem**: Payment failures, refunds, chargebacks can kill trust and revenue.  
**Impact**: Lost revenue, customer frustration, stripe disputes  
**Likelihood**: Medium

**Mitigation**:
- [ ] Use Stripe (battle-tested, handles disputes)
- [ ] Implement idempotent payment requests (prevent double-charges)
- [ ] Email confirmation immediately after charge
- [ ] Refund policy: full refund up to 7 days before event
- [ ] Dispute resolution: refund + organizer compensation
- [ ] Monitor chargeback rate (alert if >1%)
- [ ] PCI compliance audit before launch

**Validation**: Manual testing of 20+ payment scenarios

---

### Risk 3: QR Code / Check-In Failures at Event
**Problem**: At event time, organizer can't scan tickets → people get stuck at door → angry attendees.  
**Impact**: Bad first impression, negative word-of-mouth  
**Likelihood**: Medium

**Mitigation**:
- [ ] Offline check-in: QR scanner works without internet (sync on reconnect)
- [ ] Backup method: manual list lookup (name → email)
- [ ] Printed attendee list as fallback (no tech required)
- [ ] Phone support available (chat or hotline) during events
- [ ] Post-event debugging: log all check-ins, identify failures
- [ ] 24-hour email to organizer if issues detected

**Validation**: Beta test at 3 real events before launch

---

### Risk 4: Capacity Overselling
**Problem**: 500-seat room, 600 tickets sold, chaos.  
**Impact**: Fire code violation, liability, reputation damage  
**Likelihood**: Low (but catastrophic)

**Mitigation**:
- [ ] Hard cap on tickets (no overbooking allowed)
- [ ] Alerts at 80%, 90%, 100% capacity
- [ ] Visual indicator on event page ("Only 20 seats left!")
- [ ] Manual override for organizers (if needed for special circumstances)
- [ ] Clear terms: we handle inventory, organizer responsible for capacity

**Validation**: Capacity logic unit tests, manual testing

---

### Risk 5: Low Ticket Volume
**Problem**: Launch event booking, but nonprofits don't know about it → no events.  
**Impact**: No revenue, no proof of product-market fit  
**Likelihood**: High

**Mitigation**:
- [ ] Pre-launch: identify 5-10 nonprofits interested in testing (not cold outreach)
- [ ] Direct email campaign to local nonprofits (hand-written subject lines for open rate)
- [ ] Offer first event free (waive your commission) to build proof points
- [ ] Case studies: publish results of first events (attendance, revenue, organizer feedback)
- [ ] Referral incentive: organizer gets $50 credit per referral
- [ ] Partnership with local nonprofit networks (they promote to members)

**Validation**: 5+ committed events before public launch

---

## Catering Risks

### Risk 1: COGS Tracking Inaccuracy
**Problem**: You estimate $5/serving COGS, but actual is $7/serving → margin collapses.  
**Impact**: Unprofitable events, inability to price correctly  
**Likelihood**: High

**Mitigation**:
- [ ] Menu costing: calculate each dish from ingredient components
- [ ] Actual cost tracking: log every ingredient used per event
- [ ] Monthly reconciliation: compare estimated vs. actual COGS (variance analysis)
- [ ] Trend analysis: if actual consistently >estimate by 10%+, adjust base costs
- [ ] Recipe versioning: if a recipe changes, version it (old events use old costing)
- [ ] Staff training: portion control matters for margin
- [ ] Audit: randomly weigh ingredients on kitchen scale to verify portions

**Validation**: Run 5 events, compare estimated vs. actual COGS, identify gaps

---

### Risk 2: Ingredient Stockouts
**Problem**: Order placed too late, vendor can't deliver by event date → improvise or cancel.  
**Impact**: Event quality drops, customer upset, lost margin  
**Likelihood**: Medium

**Mitigation**:
- [ ] Lead time awareness: UI shows "available to order until [date]"
- [ ] Automated reorder alerts: "Order X by [date] for event on [date]"
- [ ] Multi-vendor setup: if one vendor can't deliver, try another
- [ ] Backup ingredients: for critical items, have 2 suppliers
- [ ] Safety stock: keep 1-2 extra of high-demand items
- [ ] Kitchen communication: clear prep list shows what's needed and when
- [ ] Contingency menu: if X ingredient unavailable, substitute Y (pre-approved)

**Validation**: Test vendor ordering workflow before launch

---

### Risk 3: Schedule Conflicts
**Problem**: Two events on same day, not enough kitchen space or staff.  
**Impact**: One event suffers in quality, staff burnt out  
**Likelihood**: Medium

**Mitigation**:
- [ ] Capacity planning: dashboard shows kitchen % utilization per day
- [ ] Warnings: "You're at 80% kitchen capacity on [date], consider declining new events"
- [ ] Staff scheduling: assign team to events, flag conflicts
- [ ] Cross-training: develop backup staff for key roles
- [ ] Seasonal forecasting: predict Q4 volume, hire seasonal help early
- [ ] Dynamic pricing: increase price if you're at >70% capacity (pass burden to customer)
- [ ] Subcontracting option: partner with other caterers for overflow

**Validation**: Simulate 30-day calendar with peak capacity events

---

### Risk 4: Customer Dissatisfaction
**Problem**: Event execution is mediocre (food cold, late arrival, poor presentation) → negative review.  
**Impact**: Reputation damage, low repeat rate  
**Likelihood**: Medium

**Mitigation**:
- [ ] Pre-event briefing: visit location, confirm access, parking, setup time
- [ ] Execution checklist: setup time, food temp checks, guest count verification
- [ ] Tastings: for high-value events, offer pre-event tasting
- [ ] Post-event survey: NPS + open feedback
- [ ] Response protocol: if NPS <8, follow up immediately
- [ ] Quality assurance: spot-check 10% of events (hire mystery shopper?)
- [ ] Staff training: customer service + food handling

**Validation**: Gather customer feedback from 5+ real events

---

### Risk 5: Proposal Pricing Errors
**Problem**: Quote $3k for 100 people, actual cost $3.5k, margin goes negative.  
**Impact**: Unprofitable event, loss of motivation  
**Likelihood**: Medium (especially if menu/pricing data is stale)

**Mitigation**:
- [ ] Template-based pricing: pre-set prices for standard menus
- [ ] Cost review: before sending proposal, review estimated margin (flag if <25%)
- [ ] Ingredient price updates: monthly refresh of ingredient costs
- [ ] Version control: if you change a menu item cost, warn open proposals
- [ ] Manual review: for events >$5k, manager approves proposal before sending
- [ ] Tiering: offer "basic", "standard", "premium" tiers with fixed prices

**Validation**: Review pricing accuracy on 10 proposals before launch

---

## Franchise Risks

### Risk 1: Low Franchisee Adoption of Platform
**Problem**: Franchisee finds it cumbersome, enters data manually or not at all → dashboard is stale.  
**Impact**: Can't track compliance or performance, loose control  
**Likelihood**: High

**Mitigation**:
- [ ] Onboarding call: walk franchisee through each feature (not just docs)
- [ ] Mobile app: check daily KPIs on phone (easier than laptop)
- [ ] POS integration: auto-pull sales data (don't make them report manually)
- [ ] Notifications: push them to log in ("Your monthly report is due")
- [ ] Incentive: franchisee with best adoption gets recognition/discount
- [ ] Support: responsive support team (Slack channel, phone line)
- [ ] Training: video walkthroughs for each feature

**Validation**: Adopt with 2-3 test franchisees, measure weekly usage rate

---

### Risk 2: Disputes Over Territory / Royalties
**Problem**: Franchisee claims territory was promised, another franchisee operates there → legal/conflict.  
**Impact**: Relationship damage, legal costs, platform trust erosion  
**Likelihood**: Medium

**Mitigation**:
- [ ] Clear documentation: franchise agreement explicitly defines territory boundaries (with map)
- [ ] Territory mapping: visual confirmation during signup
- [ ] Conflict resolution process: clearly defined escalation (doc the process in system)
- [ ] Arbitration clause: franchise agreement includes neutral arbitration option
- [ ] Transparency: franchisees can see neighboring territories (prevent blind spots)
- [ ] Legal review: franchise agreement reviewed by lawyer before any franchisee signs
- [ ] Audit log: every territory change logged with approval chain

**Validation**: Have lawyer review process before first franchisee

---

### Risk 3: Franchisee Non-Compliance
**Problem**: Franchisee ignores compliance requirements (reports late/missing, brand standards violated).  
**Impact**: Brand damage, legal liability, hard to enforce agreements  
**Likelihood**: Medium

**Mitigation**:
- [ ] Clear expectations: compliance checklist shared at signup
- [ ] Automated reminders: notifications 5 days, 1 day before deadline
- [ ] Escalation workflow: missed deadline → franchisee email → manager → franchisor call
- [ ] Dashboard visibility: franchisee sees their compliance score
- [ ] Incentive: compliance bonus (e.g., "3 months perfect compliance = royalty discount")
- [ ] Audit rights: your team can audit compliance at any time (documented in agreement)
- [ ] Consequences: franchise agreement spells out penalties for non-compliance

**Validation**: Define compliance checklist before onboarding first franchisee

---

### Risk 4: Royalty Collection Issues
**Problem**: Franchisee reports lower sales than they actually had (to avoid royalties) → lost revenue.  
**Impact**: Revenue leakage, unfairness to other franchisees  
**Likelihood**: Low (if you have POS integration) but Medium (if self-reported)

**Mitigation**:
- [ ] POS integration: auto-pull sales from Square, Toast, Shopify
- [ ] Reconciliation: monthly report from franchisee must match POS data
- [ ] Audit rights: right to audit franchisee's books at any time
- [ ] Penalties: underreporting carries contractual penalties (e.g., 2x royalty owed)
- [ ] Bank feeds: auto-sync bank deposits to verify revenue
- [ ] Tax alignment: royalty tied to tax-reported revenue (incentive alignment)

**Validation**: Implement POS integration for first franchisee before launch

---

### Risk 5: Franchisee Churn
**Problem**: Franchisee buys into system, then exits after 2 years → high churn.  
**Impact**: Lower lifetime value, harder to forecast revenue, loss of brand presence  
**Likelihood**: Medium

**Mitigation**:
- [ ] Multi-year commitment: franchise agreements are 3-5 years (not 1 year)
- [ ] Renewal rate tracking: dashboard shows % of franchisees up for renewal + churn risk
- [ ] Franchise health dashboard: identify struggling franchisees early
- [ ] Support: proactive outreach to low-performing franchisees (help them succeed)
- [ ] Exit process: clear buyout terms in agreement (so you can acquire a failed unit)
- [ ] Peer support: forum or group calls where franchisees share best practices
- [ ] Upgrade path: help successful franchisees expand (additional units/territories)

**Validation**: Define retention metrics before onboarding, track weekly

---

## Cross-Vertical Risks

### Risk 1: Platform Stability & Uptime
**Problem**: API goes down during peak time (event ticket sales, franchisee monthly reporting) → rage, refunds, disputes.  
**Impact**: Revenue loss, customer churn, trust erosion  
**Likelihood**: Low (if engineered well) but High (if poorly done)

**Mitigation**:
- [ ] Architecture: load balancing, read replicas, auto-failover
- [ ] Monitoring: Datadog/Sentry alerts for errors, latency, downtime
- [ ] Incident response: documented runbooks for common failures
- [ ] Testing: load testing before each major launch (simulate peak traffic)
- [ ] SLA: 99.5% uptime, public status page
- [ ] Communication: real-time alerts to affected users if outage
- [ ] Backup systems: manual workarounds if platform down (export data, phone support)

**Validation**: Stress test 10x expected peak traffic before launch

---

### Risk 2: Data Security & Privacy
**Problem**: Data breach (customer emails, payment info, franchisee data) → regulatory fines, lawsuits, brand damage.  
**Impact**: Existential threat  
**Likelihood**: Low (if secure) but catastrophic (if breached)

**Mitigation**:
- [ ] Encryption: TLS in transit, encrypted at rest for sensitive fields
- [ ] Password hashing: bcrypt, not plain text
- [ ] No card storage: use Stripe, never store raw card data
- [ ] Access control: role-based, encrypt API keys, audit logs
- [ ] PII handling: GDPR-compliant (export user data, delete on request)
- [ ] Regular audits: quarterly security review
- [ ] Dependency scanning: automated vulnerability scanning of npm packages
- [ ] Penetration testing: hire external firm before public launch

**Validation**: Security review + pen testing before taking payment

---

### Risk 3: Integration Failures (POS, Vendor, Email)
**Problem**: Stripe integration breaks, emails don't send, POS data doesn't sync → orphaned data, confusion.  
**Impact**: Lost revenue, support burden, customer frustration  
**Likelihood**: Medium

**Mitigation**:
- [ ] Graceful degradation: if Stripe down, queue payment locally, retry later
- [ ] Fallback flows: if email fails, notify in-app instead
- [ ] Monitoring: alert on failed integrations (email, POS, vendor API)
- [ ] Retry logic: exponential backoff for failed API calls
- [ ] Circuit breaker: if 3rd party API failing, switch to offline mode (don't crash)
- [ ] Testing: integration tests against sandbox APIs before production
- [ ] Vendor SLAs: negotiate uptime guarantees with critical vendors (Stripe, SendGrid)

**Validation**: Integration tests before each vertical launch

---

### Risk 4: Competitor Entering Market
**Problem**: Established player (HubSpot, Toast, GoHighLevel) launches competing feature.  
**Impact**: Commoditization, price pressure, feature race  
**Likelihood**: High (but timeline matters—if you move fast, you build moat)

**Mitigation**:
- [ ] First-mover advantage: launch early, build customer loyalty before big players notice
- [ ] Vertical specialization: deep expertise in franchises/catering/events (not generalist)
- [ ] Customer lock-in: integrations that are hard to replicate (POS, vendor)
- [ ] Community: build peer network of franchisees/organizers (switch cost high)
- [ ] Data insights: over time, develop proprietary data on best practices (ML models)
- [ ] Acquisition option: if established player acquires you, it's a win (exit)

**Validation**: Focus on early traction (launch by month 3)

---

### Risk 5: Scope Creep
**Problem**: You keep adding features (mobile app, AI predictions, white-label) before MVP is solid.  
**Impact**: Delays to market, diluted product, missed deadlines  
**Likelihood**: High

**Mitigation**:
- [ ] Ruthless prioritization: MVP = smallest set of features that solve core pain
- [ ] Write it down: frozen feature list for each phase (no mid-phase additions)
- [ ] Defer: "interesting" ideas go into "Backlog" spreadsheet for post-launch
- [ ] Focus: if not directly supporting [vertical] MVP, it's deferred
- [ ] Weekly review: track scope creep (if you've added >5 new items, slow down)

**Validation**: Commit to feature freeze 2 weeks before each phase launch

---

## Unknown Risks (To Be Discovered)

| Area | Question | How to Discover | Timeline |
|------|----------|-----------------|----------|
| **Franchisee Finance** | Do franchisees have bookkeeping to verify royalties? | Chat with 3 potential franchisees | Before franchise MVP |
| **Catering Margins** | What % margin is realistic for different event types? | Analyze 10 catering businesses' pricing | Before catering MVP |
| **Event Booking Model** | What commission % do organizers accept (5%? 10%? 20%)? | Survey 20 nonprofits | Before event launch |
| **Multi-Concept** | Do franchisees want to run catering + events at same location? | Interview 5 potential franchisees | Before phase 2 |
| **Vendor Relationships** | Which vendors will integrate their APIs for ingredient ordering? | Outreach to 5 catering suppliers | Before catering scaling |
| **Regulatory** | Are there franchise, catering, or event-specific regulations we need to comply with? | Consult lawyer per state | Before each vertical MVP |

---

## Checklist: Before Each Phase Launch

### Before Event Booking (Week 10)
- [ ] Event creation <5 min (measure 5 test users)
- [ ] Ticket purchase conversion >10%
- [ ] Check-in success rate >95%
- [ ] Payment processing accuracy 100%
- [ ] Customer satisfaction 4+/5
- [ ] No known critical bugs
- [ ] Uptime test: 99%+ for 1 week
- [ ] Security audit: no obvious vulnerabilities
- [ ] Support process documented

### Before Catering (Week 28)
- [ ] Proposal generation <5 min
- [ ] COGS accuracy within 10% (5 events)
- [ ] Prep list completeness >95%
- [ ] Invoice accuracy 100%
- [ ] Kitchen utilization <80% (capacity available)
- [ ] Customer satisfaction 4+/5
- [ ] No known critical bugs
- [ ] Vendor integrations tested
- [ ] Support process documented

### Before Franchise (Week 52)
- [ ] Franchisee onboarding <1 week
- [ ] Daily active user rate >70%
- [ ] Royalty calculation accuracy 100%
- [ ] Compliance reporting >90% on-time
- [ ] Performance dashboard useful (franchisee confirms)
- [ ] No known critical bugs
- [ ] Legal review: franchise agreement vetted by lawyer
- [ ] POS integration tested (if available)
- [ ] Support process documented

---

## How to Use This Document

1. **Before coding**: Review risks for your MVP vertical (e.g., event booking risks)
2. **During development**: Check mitigation checklist weekly (are we addressing these?)
3. **Before launch**: Run "Before Phase Launch" checklist
4. **After launch**: Post-mortem on any risks that materialized (update document)
5. **Quarter review**: Update unknown risks based on discovery

This document is not set in stone—update it as you learn.
