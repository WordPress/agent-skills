# Vertical Requirements Research

## 1. FRANCHISE SYSTEMS

### Business Model
- **Revenue**: Upfront franchise fees + recurring royalties (% of sales)
- **Relationship**: Franchisor (you, the platform owner) ↔ Franchisees (SMB owners) ↔ Their staff
- **Scale**: Hundreds to thousands of units, each with their own P&L
- **Compliance**: Franchise agreement terms, territory rights, performance KPIs

### User Roles & Workflows

#### Franchisor Admin (Headquarters)
**Dashboard Needs**:
- System-wide health: total units, aggregate revenue, default rate flags
- Performance leaderboard: ranking franchisees by revenue/growth
- Compliance calendar: franchise anniversary dates, renewal windows
- Territory map: franchisee coverage by region, gap identification

**Operations**:
- Approve new franchisee applicants (background check integration?)
- Distribute marketing materials & operational playbooks
- Manage franchise agreements (versioning, signature workflows)
- Monitor unit performance → early warning system (declining sales)
- Handle disputes (territory overlap, agreement violations)
- Reporting: franchise health, renewal pipeline, churn risk

#### Franchisee Owner (Unit Operator)
**Dashboard Needs**:
- P&L for their unit (sales, COGS, labor, rent, franchise fee)
- Year-over-year trends (is my unit growing?)
- Labor scheduling (staff, shifts)
- Inventory tracking (if food/product-based)
- Local marketing execution (co-op fund tracking)

**Operations**:
- Submit performance reports to franchisor
- Request territory expansion/modification
- Access support from franchisor (ticket system)
- Manage staff (onboarding, scheduling)
- Access franchise playbooks & training materials

#### Staff (at franchisee location)
**Needs**: Task management, clock in/out, order fulfillment, basic reporting

### Key Features

**Mandatory** (at MVP):
- Franchisee directory (searchable by territory, performance, status)
- Franchise agreement tracker (signed, expiring, renewal due)
- Sales performance dashboard (franchisee-level rollups, territory comparisons)
- Unit scorecard (5-10 KPIs: revenue, ACV, customer count, staff turnover, compliance)
- Notifications & escalation (owner not submitting reports → franchisor alert)
- Royalty calculation & payment tracking (% of sales automated if POS integration exists)

**High Priority** (6 months):
- Staff management per unit (shared with catering/events for multi-concept franchises)
- Territory management (map view, conflict resolution workflow)
- Franchise agreement versioning & e-signature integration
- Performance forecasting (trend analysis, churn prediction)
- Support ticket system (franchisee → franchisor support)
- Training/onboarding module (video playbooks, completion tracking)

**Nice-to-have** (year 1+):
- Peer benchmarking (compare my unit to similar units)
- Automated compliance audits (checklist-based)
- Inventory forecasting (demand planning)
- Co-op marketing fund management & reporting

### Data Model Sketch
```
Franchisee
  ├─ Territory (region, zip codes)
  ├─ AgreementTerms (franchise fee, royalty %, term length)
  ├─ RenewalStatus (expires_at, signed_date, current_version)
  ├─ UnitPerfD (monthly: sales, cogs, labor, customer_count)
  └─ Staff (owned by franchisee)

Territory
  ├─ Boundaries (GeoJSON)
  ├─ CurrentOwner (franchisee_id)
  ├─ ConflictLog (disputes)
  └─ ExpansionRequests

FranchiseeMetrics (daily/weekly rollup)
  ├─ Revenue, ACV, customer_count
  ├─ EmployeeCount, Turnover
  ├─ ComplianceScore (reports submitted on time?)
  └─ HealthRating (green/yellow/red)
```

### Integration Points
- POS systems (Square, Toast, Toast) → pull sales data automatically
- Bank feeds → reconcile royalty payments
- E-signature (DocuSign) → franchise agreements
- Mapping (Google Maps, Mapbox) → territory visualization
- Email (SendGrid) → escalation notifications, renewal reminders
- Slack/Teams → alerts for compliance issues

### Success Metrics
- Franchisee retention (% renewed)
- Time to close new franchisee (from application to signed agreement)
- Royalty collection rate (% on time)
- Support ticket resolution time
- Dashboard adoption rate (% checking their metrics weekly)

---

## 2. CATERING

### Business Model
- **Revenue**: Per-event project pricing + upsells (premium items, bar, desserts)
- **Seasonality**: Heavy Q4 (holiday parties), Q2 (weddings), summer events
- **Complexity**: Multi-step workflow (inquiry → proposal → booking → prep → execution → invoice)
- **Constraints**: Limited kitchen capacity, ingredient lead times, delivery logistics

### User Roles & Workflows

#### Sales (Business Development)
**Needs**:
- Lead capture (web form, phone, email)
- Inquiry dashboard (new inbound, status, follow-up date)
- Proposal generation (branded, includes menu + pricing + timeline)
- Lead scoring (high margin, repeat client, referral potential)
- Win/loss analysis (why did we lose that $10k wedding?)

**Workflow**:
1. Inbound lead (event date, guest count, budget)
2. Qualify (feasible date? within service area? budget alignment?)
3. Send menu + pricing
4. Negotiate (they want XYZ, we counteroffer)
5. Close or lose (add to CRM, follow-up campaign if lost)

#### Operations (Event Planning)
**Needs**:
- Confirmed event calendar (date, location, headcount, menu selections)
- Timeline view (14 days out → ingredients ordered, 7 days → prep schedule, 2 days → team assigned)
- Capacity utilization (kitchen %, delivery van %, staff availability)
- Ingredient tracking (what we need to buy, par levels, vendor lead times)
- Equipment checklist (serving dishes, heating elements, linens)
- Delivery routing (multi-stop, time windows)

**Workflow**:
1. Event confirmed in CRM (sales moved to "booked")
2. Pull event details → cost estimate (COGS)
3. Order ingredients (respecting vendor lead times, par levels)
4. Schedule team (chef, kitchen assistants, delivery)
5. Generate prep list (who does what, when)
6. Check equipment (reserved? cleaned? ready to go?)
7. Execute event (on-time arrival, setup, execution, teardown)
8. Invoice & upsell (add-ons purchased on-site)

#### Kitchen/Execution Team
**Needs**:
- Daily prep list (today's assignments, tomorrow's prep)
- Recipe specs + portion counts
- Ingredient status (arrived? available? shortage?)
- Team assignments (who's assigned to which event, when)
- Actual vs. planned cost tracking

#### Customer (Event Organizer)
**Needs** (via web portal):
- View proposal details
- Approve/modify menu
- See final headcount & pricing
- Submit payment
- View event day confirmation (arrival time, contact info)

### Key Features

**Mandatory** (MVP):
- Lead capture & qualification
- Proposal generation (template-based, menu library, auto-pricing)
- Event calendar (date, headcount, menu, status, profit estimate)
- Kitchen prep list (ingredients to buy, prep tasks, timeline)
- Ingredient inventory (current par levels, vendor ordering)
- Team scheduling (assign staff to events, shift coverage)
- Invoicing (send to customer, track payment)

**High Priority** (6 months):
- Customer portal (view proposal, approve, pay online)
- Vendor management (vendor list, lead times, pricing, auto-ordering)
- Menu library (dishes, seasonal rotation, ingredient components)
- Upsell tracking (wine, dessert, premium items added during negotiation)
- Cost tracking (actual COGS vs. estimated, margin per event)
- Delivery routing (multiple stops, time optimization)
- Equipment inventory (what we own, availability, maintenance schedule)

**Nice-to-have** (year 1+):
- Seasonal forecasting (predict Q4 volume, resource planning)
- Recipe costing (ingredients + labor per dish)
- Supplier integration (auto-pricing, auto-ordering)
- Employee timesheets & payroll integration
- Customer satisfaction survey (post-event NPS)
- Referral tracking (which events led to new business?)

### Data Model Sketch
```
Lead
  ├─ ContactInfo (name, phone, email, company)
  ├─ EventDetails (date, location, headcount_estimate, budget, occasion_type)
  ├─ Status (inquiry, proposed, negotiating, booked, lost)
  └─ ProposalVersion (menu, pricing, notes, created_at)

Proposal
  ├─ Menu (selected dishes + quantities)
  ├─ Pricing (per-person, total, upsell items)
  ├─ Timeline (proposal valid until, deposit due, final count due)
  └─ EstimatedCost (COGS, labor, delivery, margin)

Event (booked catering job)
  ├─ Customer, date, location, headcount
  ├─ ConfirmedMenu (dishes, quantities)
  ├─ AssignedTeam (chef, assistants, delivery driver)
  ├─ ProcurementPlan (ingredients ordered, vendor, delivery date)
  ├─ PrepTimeline (assigned tasks, responsible person, due date)
  ├─ ActualCost (ingredients used, labor, delivery)
  └─ Invoice (amount, payment status, tips/upsells)

Ingredient
  ├─ Name, category, unit_cost, par_level
  ├─ Vendor, lead_time_days
  └─ CurrentStock (qty, expiry date)

EquipmentItem
  ├─ Name, category (dishes, linens, heating)
  ├─ Quantity_owned, MaintenanceLog
  └─ EventAssignments (which events need this)
```

### Integration Points
- Email (proposalgeneration) → branded proposals, customer updates
- Payment gateway (Stripe) → online proposal approval & deposit collection
- Accounting (QuickBooks, Xero) → expense & invoice sync
- Vendor APIs (if available) → ingredient ordering, pricing updates
- Google Calendar → team member syncing, conflict detection
- Maps/routing → delivery optimization (Google Routes API)
- SMS → customer reminders, last-minute changes

### Success Metrics
- Proposal-to-booking rate (% of sent proposals that close)
- Average event margin (revenue - COGS - labor - delivery)
- Kitchen utilization (% of capacity used monthly)
- Ingredient waste (% of purchased that goes unused)
- Customer satisfaction (post-event NPS)
- Repeat customer rate (% of customers who book 2+ events/year)
- On-time delivery rate (% of events arriving on schedule)

---

## 3. EVENT BOOKING (Fundraisers)

### Business Model
- **Revenue**: Commission per ticket (e.g., $3 of every $25 ticket) + premium features (VIP tiers, sponsorships)
- **Use Case**: Fundraising events held AT your stores (not catered elsewhere)
- **Examples**: School fundraiser night, charity auction, silent auction, gala (ticketed), kids' costume party
- **Timeline**: Quick turnaround (weeks, not months like weddings) + last-minute sales surge

### User Roles & Workflows

#### Event Organizer (Nonprofit, School, Community Group)
**Needs**:
- Easy event setup (name, date, location—pre-fill your store details, time, capacity)
- Ticket tiers (standard, VIP, group discounts)
- Messaging (what's the fundraiser for? Why should people come?)
- Online ticket sales (ticket page, embedded widget, social sharing)
- Real-time ticket count & revenue visibility
- Attendee list download (for check-in)
- Promotional tools (email to their list, social templates)

**Workflow**:
1. Create event (date, time, capacity, ticket price, story)
2. Customize ticket page (colors, logo, description)
3. Share link on social, email, website
4. Monitor real-time sales dashboard
5. Send reminder emails (1 week out, 3 days out, day-of)
6. Download attendee list for check-in
7. Post-event thank you & metrics report

#### Your Store (Event Host)
**Needs**:
- Event calendar (which fundraisers, when, capacity allocated)
- Capacity management (max 500 people → flag if 450+ tickets sold)
- Check-in workflow (scan tickets, mark attendance)
- Point-of-sale integration (track sales during event, tie to fundraiser)
- Revenue split clarity (store % vs. nonprofit %, commission to you)

#### Attendees
**Needs** (via event page):
- Event details (date, time, location, why it matters)
- Ticket options (price tiers, quantity)
- Mobile ticket (QR code, mobile wallet if possible)
- Social sharing (bring friends, share on social)
- Reminder emails before event

#### Your Admin (Platform Owner)
**Needs**:
- Dashboard: all fundraisers hosted at your location, total revenue, commission
- Capacity alerts (event X is at 90% capacity)
- Revenue reporting (commission collected, by event, by date)
- Payout schedule (when do I get paid? what's pending?)
- Refund/cancellation handling (event cancelled, refund tickets)

### Key Features

**Mandatory** (MVP):
- Event creation wizard (name, date, time, capacity, ticket price, description)
- Customizable event page (branding, images, story, ticket options)
- Ticket sales (online payment via Stripe, real-time inventory)
- Attendee list (name, email, ticket type, purchase date)
- Check-in workflow (mobile or web, mark attendance)
- Email reminders (to organizer & attendees, templated)
- Revenue dashboard (organizer sees their sales & commission; you see your commission)

**High Priority** (6 months):
- Ticket tiers & pricing rules (VIP, group discounts, early bird pricing)
- Capacity alerts (warn organizer & store when near cap)
- Mobile ticket (QR code, Apple Wallet/Google Pay integration)
- POS integration (tie in-store sales to event, revenue attribution)
- Refund handling (cancel ticket, refund process, store gets %?)
- Multi-ticket bulk purchases (groups buying 10+ tickets at once)
- Email marketing (organizer can email attendees pre/post event)
- Reporting (organizer gets revenue breakdown, you get commission report)

**Nice-to-have** (year 1+):
- Sponsorship tiers (tier 1 sponsor logo on event page, benefits)
- Merchandise sales (sell t-shirts, mugs tied to event)
- Donation option (attendees add tip/donation at checkout)
- Donor wall (recognize sponsors/large donors on event page)
- Social sharing analytics (which shares drove tickets?)
- Attendance prediction (ML: based on email opens, shares, sales trajectory)
- Repeat attendee tracking (build loyalty, upsell VIP next year)

### Data Model Sketch
```
Event
  ├─ Organizer (nonprofit/school info, contact, EIN?)
  ├─ EventDetails (name, date, time, description, capacity, location = store)
  ├─ TicketTiers (standard: $25, VIP: $50, group_10+: $20 each)
  ├─ Status (draft, live, sold_out, in_progress, completed, cancelled)
  ├─ TicketsSold (current count, revenue, commission)
  ├─ Dates (created, live_at, event_at, deadline_to_purchase)
  └─ Branding (organizer logo, colors, images, story text)

Ticket (individual ticket sold)
  ├─ Event, AttendeeEmail, TicketType (standard/VIP)
  ├─ PurchaseDate, PurchasePrice
  ├─ QRCode, Status (active, used/checked_in, refunded, cancelled)
  └─ CheckInTime (nullable until event day)

Attendee (person who bought 1+ tickets)
  ├─ Name, Email, Phone
  ├─ Tickets (list of ticket_ids owned)
  ├─ EngagementHistory (emails opened, reminder clicks, shares)
  └─ EventHistory (past events attended, repeat_customer?)

Revenue
  ├─ Event, TotalTicketRevenue
  ├─ Commission to Platform (% or flat)
  ├─ Commission to Store (% or flat if store is co-sponsor)
  ├─ Commission to Organizer (100% minus platform & store cuts)
  └─ PayoutStatus (pending, completed, scheduled)

CheckIn
  ├─ Event, TicketID, AttendeeEmail
  ├─ CheckInTime, CheckInMethod (scan, manual, list-check)
  └─ AttendanceConfirmed (true)
```

### Integration Points
- Payment gateway (Stripe) → ticket sales
- Email (SendGrid, Mailgun) → reminders, confirmations, thank-yous
- SMS (Twilio) → last-minute reminders, check-in updates
- QR code generation → mobile tickets
- Mobile wallet (Apple Wallet, Google Pay) → ticket delivery
- Google Calendar → attendee calendar export
- POS (Square, Toast, Shopify) → revenue attribution to specific events
- Social sharing (Facebook, Twitter) → share tracking, click attribution
- Email marketing (Klaviyo, Mailchimp) → organizer email campaigns

### Success Metrics
- Events hosted per month (volume)
- Average tickets sold per event (engagement)
- Commission collected (revenue)
- Repeat organizer rate (% who host 2+ events/year)
- Ticket refund rate (% cancelled, should be <5%)
- Check-in rate (% of tickets actually used at event)
- Capacity utilization (avg % of event capacity filled)
- Email engagement (open rate, click rate on reminders)

---

## Cross-Vertical Observations

### Shared Infrastructure
- **Contact Management** (franchisee owner, catering customer, event organizer = "parties" in CRM)
- **User Management** (staff at location, franchisee, organizer team members)
- **Payment Processing** (franchise fees, catering invoices, event ticket sales = all money in)
- **Calendar** (event dates, delivery dates, franchisee deadlines, event attendance dates)
- **Reporting & Analytics** (performance dashboards, revenue tracking)
- **Notifications** (alerts, reminders, escalations)
- **Mobile/Web Portal** (franchisee checks unit health, organizer checks ticket sales, customer pays catering invoice)

### Separate Vertical Logic
- **Franchise**: Hierarchy, territories, compliance, long-term relationships
- **Catering**: Logistics, ingredient sourcing, complex cost tracking
- **Events**: Capacity constraints, rapid ticket sales, public-facing marketing

---

## Questions to Answer Before Design

1. **Multi-Concept**: Can a single franchisee run catering + events at the same location? If yes, shared calendar/staff/inventory system is critical.
2. **White-Label**: Do franchisees get their own branded web portal? Or access via franchisor dashboard?
3. **Geographic Scope**: Single metro? Multi-state? International? Affects data residency, compliance.
4. **POS Integration**: Which POS systems are non-negotiable? (Square, Toast, Shopify, etc.)
5. **Supplier Integration**: Will you auto-order catering ingredients from specific vendors? Or franchisees use their own?
6. **Reporting**: Do franchisees want detailed P&L, or just top-line KPIs?
7. **Support**: How much hand-holding do franchisees need vs. self-serve?
