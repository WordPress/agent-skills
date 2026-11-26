# Architecture & Tech Stack

---

## Overview

This document proposes the tech stack, data model approach, API design, and key architectural decisions for the multi-vertical CRM.

---

## Tech Stack Recommendation

### Backend
- **Runtime**: Node.js (18+ LTS)
- **Framework**: Express.js (lightweight, well-documented, battle-tested)
- **Language**: TypeScript (type safety, refactoring confidence)
- **Database**: PostgreSQL (16+, JSONB for flexibility, strong relational model, proven at scale)
- **ORM**: Drizzle (better type inference, migration control, edge-ready — recommended over Prisma)
- **Job Queue**: Bull (Redis-backed, simple job scheduling for email, notifications)
- **Caching**: Redis (session management, real-time updates)
- **Search** (optional future): Elasticsearch or TypeSense (for advanced search across leads, events)
- **Events**: EventEmitter (Node.js built-in, event registry for blocks communication)

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (fast dev server, faster builds than webpack)
- **Styling**: Tailwind CSS (utility-first, responsive, no CSS friction)
- **Component Library**: Shadcn/ui or Headless UI (accessible, composable, no design system drag)
- **State Management**: TanStack Query (React Query) for server state, Zustand for client state
- **Forms**: React Hook Form + Zod validation (lightweight, performant)
- **Charting**: Recharts or Chart.js (clean dashboards, minimal dependencies)

### DevOps & Hosting
- **Container**: Docker (Dockerfile, docker-compose for local dev + self-hosted deployments)
- **Development**: docker-compose.yml with postgres:16, redis:7, api:3000, frontend:3001, migrate service
- **Self-Hosting**: Franchisees can run `docker compose up` locally (BYOK compliance, no third-party data)
- **Cloud Hosting** (for SaaS offering): Fly.io/Railway (backend) + Vercel (frontend) for MVP, AWS/GCP later
- **Database Hosting**: PostgreSQL 16 (Managed on cloud, or self-hosted via Docker)
- **CDN**: Cloudflare (DDoS protection, caching, fast delivery)
- **Monitoring**: Sentry + Datadog (error tracking, APM)
- **Analytics**: PostHog (open-source, privacy-first product analytics)
- **Email Delivery**: SendGrid or AWS SES (transactional emails)

### Development & CI/CD
- **Version Control**: GitHub (already in use)
- **CI/CD**: GitHub Actions (free, integrated)
- **Testing**: Jest (unit + integration tests), Playwright (E2E tests)
- **Linting**: ESLint + Prettier (code quality)
- **Pre-commit Hooks**: Husky + lint-staged (prevent bad commits)

---

## Data Model Approach

### Option A: Unified Schema (Recommended for MVP)
**Concept**: Single PostgreSQL database with shared tables + vertical-specific tables, toggled via feature flags.

**Pros**:
- Simple to build (one DB, one schema)
- Easy to share data (franchisee attends event, same contact)
- Transactions across verticals (if needed)
- Lower ops complexity

**Cons**:
- Schema gets complex if verticals diverge heavily
- Hard to optimize queries for each vertical
- Risk of coupling verticals unintentionally

**Table Structure**:
```
Shared Tables:
- organizations (your company, franchisees, nonprofits)
- organization_types (enum: franchisor, franchisee, nonprofit, store)
- users (people who log in)
- user_roles (franchise_admin, catering_sales, event_organizer, etc.)
- contacts/parties (people: franchisee owner, catering customer, event attendee)
- calendars (date-based events)
- notifications (alerts, reminders)
- email_templates (reusable email layouts)
- audit_logs (who did what, when)
- integrations (connected 3rd parties: POS, vendor, Stripe, etc.)

Franchise Tables:
- franchisees (extends organizations)
- territories (geographic boundaries)
- franchise_agreements (contracts, versions, signatures)
- franchisee_metrics (monthly: sales, ACV, customer_count, etc.)
- royalty_invoices (generated from metrics or POS)
- compliance_reports (submitted by franchisee, reviewed by franchisor)
- support_tickets

Catering Tables:
- leads (inbound inquiries)
- proposals (quote for lead, versioning)
- catering_events (booked jobs)
- menus (dishes, pricing, ingredients)
- menu_components (eggs, butter, flour → used in costing)
- ingredients (inventory item: name, par, vendor, lead_time)
- equipment (dishes, linens, heating elements)
- catering_team_assignments (who works which event)
- invoices (sent to catering customer)

Event Booking Tables:
- events (fundraiser, concert, etc.)
- ticket_tiers (standard, VIP, group discount)
- tickets (individual ticket sold to attendee)
- attendees (who buys tickets)
- check_ins (was this ticket used at the event?)
- event_revenue (total sold, commission split)
```

### Option B: Microservices with Shared API (Future Scaling)
**Concept**: Three separate services (franchise-service, catering-service, events-service) with shared core, communicate via API.

**Pros**:
- Each vertical has independent DB & can optimize for their queries
- Teams can scale independently
- Easy to deploy one vertical without affecting others

**Cons**:
- Complex distributed system (network calls, eventual consistency)
- Harder to build MVP fast (more moving parts)
- Data sharing requires API calls (slower than JOIN)
- Not recommended until you have clear operational bottlenecks

**Decision**: Build Option A for MVP (unified schema), plan migration path to Option B later if needed.

---

## Database Schema (Simplified ERD)

```
organizations (franchisors, franchisees, nonprofits)
├── id (UUID primary key)
├── name
├── type (enum: franchisor, franchisee, nonprofit)
├── parent_id (franchisor_id if franchisee or nonprofit)
├── logo_url
├── contact_email, contact_phone
└── metadata (JSONB for flexibility)

users
├── id (UUID)
├── email (unique)
├── password_hash
├── organization_id (FK)
├── first_name, last_name
├── avatar_url
├── last_login_at
└── created_at, updated_at

user_roles (junction table)
├── user_id (FK)
├── organization_id (FK)
├── role (enum: admin, franchisee, catering_sales, event_organizer, staff)
└── permissions (JSONB, flexible per role)

contacts (franchisee owner, catering customer, event organizer, staff member)
├── id (UUID)
├── organization_id (FK, optional; null if individual)
├── first_name, last_name, email, phone
├── type (enum: franchisee_owner, catering_customer, event_organizer, staff)
├── metadata (JSONB: dietary preferences, interests, etc.)
└── created_at, updated_at

--- FRANCHISE TABLES ---

franchisees (extends organizations)
├── organization_id (FK, primary key)
├── franchisor_id (FK to parent organization)
├── territory_id (FK)
├── franchise_agreement_id (current active agreement)
├── owner_contact_id (FK to contacts)
├── health_score (0-100, based on metrics & compliance)
└── status (enum: prospective, active, renewal_pending, inactive)

territories
├── id (UUID)
├── franchisor_id (FK)
├── name, description
├── boundaries (JSONB: GeoJSON polygon)
├── franchisee_id (FK, current owner, nullable if unassigned)
├── conflict_log (JSONB: dispute history)
└── expansion_requests (array of pending requests)

franchise_agreements
├── id (UUID)
├── franchisee_id (FK)
├── franchisor_id (FK)
├── version (int, auto-increment)
├── start_date, end_date, renewal_date
├── royalty_percentage (e.g., 6%)
├── franchise_fee (upfront)
├── signed_at, signed_by (user_id)
├── document_url (S3 link to PDF)
├── status (enum: draft, sent_for_signature, signed, active, expired, renewed)
└── created_at, updated_at

franchisee_metrics (monthly snapshot)
├── franchisee_id (FK)
├── year_month (YYYY-MM)
├── total_sales, cogs, labor, customer_count
├── growth_vs_previous_month (%)
├── employee_count, turnover_count
├── compliance_score (% of reports submitted on time)
└── calculated_royalty (auto-calc from sales * royalty_pct)

royalty_invoices
├── id (UUID)
├── franchisee_id (FK)
├── invoice_date, due_date, paid_at (nullable)
├── month_covered (YYYY-MM)
├── total_amount, payment_method
├── status (enum: drafted, sent, paid, late, disputed)
└── notes (JSONB)

compliance_reports (franchisee submits monthly/quarterly)
├── id (UUID)
├── franchisee_id (FK)
├── report_date, report_period (e.g., "Q1 2024")
├── questions_answered (JSONB: key-value checklist)
├── approved_by (user_id, franchisor admin)
├── approved_at
└── comments (notes from franchisor review)

support_tickets
├── id (UUID)
├── franchisee_id (FK)
├── created_by (user_id)
├── title, description
├── category (enum: operational, compliance, marketing, technical)
├── priority (enum: low, medium, high, urgent)
├── status (enum: open, in_progress, resolved, closed)
├── assigned_to (user_id, franchisor support staff)
└── created_at, updated_at, resolved_at

--- CATERING TABLES ---

leads (inbound catering inquiries)
├── id (UUID)
├── contact_id (FK to contacts)
├── event_date, estimated_headcount, estimated_budget
├── event_type (enum: wedding, corporate, private_party, etc.)
├── source (enum: web_form, phone, email, referral)
├── status (enum: inquiry, quoted, negotiating, booked, lost)
├── notes (internal notes, JSONB)
├── created_at, updated_at, last_follow_up_at

proposals (quotes sent to lead)
├── id (UUID)
├── lead_id (FK)
├── version (int, auto-increment)
├── proposed_date, expiry_date
├── selected_menu (JSONB: array of menu items + quantities)
├── per_person_price, total_price
├── estimated_cogs, estimated_margin
├── sent_at, sent_to (email)
├── status (enum: draft, sent, accepted, declined, superseded)
└── created_at, updated_at

catering_events (booked catering job)
├── id (UUID)
├── contact_id (FK, the customer)
├── proposal_id (FK, accepted proposal)
├── event_date, event_time, event_location
├── headcount_final
├── confirmed_menu (JSONB: array of menu items + actual quantities used)
├── assigned_team (JSONB: array of {user_id, role})
├── procurement_plan (JSONB: ingredients to order, delivery date)
├── status (enum: confirmed, prep_in_progress, in_progress, completed, cancelled)
├── actual_cogs, actual_revenue, actual_margin
├── delivery_driver_id (FK to users, nullable)
├── delivery_notes (JSONB: address, access, parking, etc.)
└── created_at, updated_at, completed_at

menu_items (dishes you can serve)
├── id (UUID)
├── name, description
├── category (enum: appetizer, entree, dessert, beverage, etc.)
├── base_cost (COGS per serving, calculated from components)
├── base_price (per person, suggested)
├── ingredients (array of {ingredient_id, quantity, unit})
├── prep_time_minutes, cooking_time_minutes
├── dietary_tags (JSONB: vegetarian, gluten_free, vegan, etc.)
├── seasonal_available (boolean, date ranges)
├── is_active (boolean, can still be booked?)
└── created_at, updated_at

ingredients (inventory)
├── id (UUID)
├── name, unit (lbs, oz, cups, count)
├── category (proteins, produce, pantry, dairy, etc.)
├── par_level (qty we try to keep in stock)
├── current_stock (qty on hand)
├── last_stock_check_at
├── vendor_id (FK, nullable)
├── lead_time_days (how long to order)
├── unit_cost, supplier_sku
├── expiry_date (nullable, if perishable)
└── created_at, updated_at

equipment (owned inventory)
├── id (UUID)
├── name, category (dishes, linens, heating, etc.)
├── quantity_owned
├── maintenance_log (JSONB: date, description, next_maintenance_due)
├── assigned_to_event (nullable, FK to catering_events)
└── created_at, updated_at

invoices (sent to customer)
├── id (UUID)
├── catering_event_id (FK)
├── contact_id (FK)
├── invoice_date, due_date
├── line_items (JSONB: [{description, qty, unit_price, amount}, ...])
├── total_amount, tax, payment_received
├── status (enum: draft, sent, paid, partially_paid, late, cancelled)
├── payment_method (enum: stripe, check, cash, invoice)
├── notes, payment_terms
└── created_at, updated_at, paid_at

--- EVENT BOOKING TABLES ---

events (fundraiser, concert, etc.)
├── id (UUID)
├── organizer_id (FK to contacts, the nonprofit/school)
├── organization_id (FK, if organizer is tied to a nonprofit org)
├── event_name, description, story (why support this?)
├── event_date, event_time
├── event_location_id (FK, your store location, pre-filled)
├── capacity_max
├── status (enum: draft, live, in_progress, completed, cancelled)
├── created_at, live_at, event_at
├── image_url, branding (JSONB: colors, logo)
└── metadata (JSONB: custom fields)

ticket_tiers (pricing tiers for an event)
├── id (UUID)
├── event_id (FK)
├── tier_name (e.g., "General Admission", "VIP", "Group 10+")
├── price
├── quantity_available (cap per tier, nullable if unlimited)
├── quantity_sold
├── benefits (JSONB: description, perks)
├── sort_order
└── created_at, updated_at

tickets (individual ticket sold)
├── id (UUID)
├── event_id (FK)
├── ticket_tier_id (FK)
├── attendee_email, attendee_name
├── purchase_date, purchase_price
├── qr_code_id (unique, for check-in)
├── status (enum: active, used, refunded, cancelled)
├── checked_in_at (nullable)
├── notes (JSONB)
└── created_at, updated_at

attendees (person who bought 1+ tickets)
├── id (UUID)
├── contact_id (FK)
├── event_id (FK)
├── email, name
├── engagement (JSONB: {emails_opened, reminder_clicks, shares})
├── total_spent (sum of all tickets purchased)
└── created_at, updated_at

event_check_ins (log entry when ticket is scanned)
├── id (UUID)
├── event_id (FK)
├── ticket_id (FK)
├── checked_in_at (timestamp)
├── checked_in_by (user_id, staff scanning)
└── notes (any issues?)

event_revenue (summary)
├── event_id (FK, primary key)
├── total_tickets_sold
├── total_gross_revenue
├── platform_commission_percentage
├── platform_commission_amount
├── organizer_payout (total - platform_commission - store_cut)
├── store_cut (if applicable)
├── status (enum: pending, paid_to_organizer, disputed)
└── payout_date

store_locations (your stores where events can be hosted)
├── id (UUID)
├── name, address, city, state, zip
├── capacity_events (max attendees for events)
├── contact_person, phone, email
├── hours_of_operation (JSONB)
├── created_at, updated_at
```

---

## API Design (REST)

### Core Endpoints Structure

```
Authentication
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  POST   /api/auth/refresh-token
  GET    /api/auth/me (current user info)

Organizations
  GET    /api/organizations (list orgs I have access to)
  POST   /api/organizations (create new org)
  GET    /api/organizations/:id
  PATCH  /api/organizations/:id
  DELETE /api/organizations/:id
  GET    /api/organizations/:id/users (members)
  POST   /api/organizations/:id/users (add member)
  PATCH  /api/organizations/:id/users/:userId/role (change role)
  DELETE /api/organizations/:id/users/:userId (remove member)

Franchises
  GET    /api/franchisees (list all franchisees, franchisor view)
  GET    /api/franchisees/:id
  POST   /api/franchisees (onboard new franchisee)
  PATCH  /api/franchisees/:id
  GET    /api/franchisees/:id/metrics (performance data)
  GET    /api/franchisees/:id/royalties (invoices)
  POST   /api/franchisees/:id/royalties (generate invoice)
  GET    /api/franchisees/:id/compliance-reports
  POST   /api/franchisees/:id/compliance-reports (submit report)
  GET    /api/franchisees/:id/support-tickets
  POST   /api/franchisees/:id/support-tickets (create ticket)
  
  GET    /api/territories (map data)
  POST   /api/territories (create territory)
  PATCH  /api/territories/:id
  
  GET    /api/franchise-agreements
  POST   /api/franchise-agreements (send for signature)
  PATCH  /api/franchise-agreements/:id (update after signature)

Catering
  GET    /api/leads (sales view)
  POST   /api/leads (intake form submit)
  GET    /api/leads/:id
  PATCH  /api/leads/:id
  GET    /api/leads/:id/proposals
  POST   /api/leads/:id/proposals (generate quote)
  
  GET    /api/catering-events (calendar view)
  POST   /api/catering-events (convert proposal to booking)
  GET    /api/catering-events/:id
  PATCH  /api/catering-events/:id
  GET    /api/catering-events/:id/prep-list
  GET    /api/catering-events/:id/invoice
  
  GET    /api/menus (available dishes)
  POST   /api/menus
  GET    /api/menus/:id
  PATCH  /api/menus/:id
  
  GET    /api/ingredients (inventory)
  POST   /api/ingredients
  PATCH  /api/ingredients/:id
  POST   /api/ingredients/:id/reorder
  
  GET    /api/invoices
  POST   /api/invoices/:id/send
  PATCH  /api/invoices/:id/mark-paid
  POST   /api/invoices/:id/refund

Events
  GET    /api/events (list all events)
  POST   /api/events (organizer creates event)
  GET    /api/events/:id
  PATCH  /api/events/:id
  
  GET    /api/events/:id/tickets (inventory)
  POST   /api/events/:id/tickets (purchase)
  
  GET    /api/events/:id/attendees
  
  POST   /api/events/:id/check-ins (scan QR code)
  
  GET    /api/events/:id/revenue (dashboard for organizer)

Shared
  GET    /api/contacts (search all contacts)
  POST   /api/contacts
  GET    /api/contacts/:id
  PATCH  /api/contacts/:id
  
  GET    /api/notifications (user's inbox)
  PATCH  /api/notifications/:id (mark read)
  
  GET    /api/calendar (events this user cares about)
  
  GET    /api/reports/franchise-summary (franchisor dashboard)
  GET    /api/reports/catering-metrics (operations dashboard)
  GET    /api/reports/event-revenue (event booking dashboard)
```

### Authentication & Authorization

- **Auth Method**: JWT (access + refresh tokens)
- **Sessions**: Redis (track active sessions, revoke on logout)
- **Permissions**: Role-based access control (RBAC) + org-based scoping
  - Franchisor admin → sees all franchisees
  - Franchisee owner → sees only their unit
  - Catering sales → sees leads & events they create
  - Event organizer → sees only their events
  - Staff → sees tasks assigned to them

---

## Deployment Architecture

### Cloud Deployment (SaaS offering)
```
Frontend (Vercel)
  ├─ Next.js or React app (built static)
  └─ Automatic deploys on push to main

API Server (Fly.io or Railway)
  ├─ Express.js backend
  ├─ Auto-scales based on CPU/memory
  └─ Automatic deploys on push to main

Database (Managed PostgreSQL)
  ├─ Daily automated backups
  ├─ Read replicas for analytics queries
  └─ Automatic failover

Job Queue (Redis)
  ├─ Email jobs (send proposals, reminders)
  ├─ Notification jobs (alerts, escalations)
  └─ Batch jobs (monthly royalty calc)

CDN & Storage (S3 + Cloudflare)
  ├─ Contract documents (PDFs, e-signatures)
  ├─ Event images
  └─ User avatars

Email Service (SendGrid)
  └─ Transactional emails

Payment Gateway (Stripe)
  ├─ Event ticket sales
  ├─ Catering invoice payments
  └─ Royalty payments (optional, if you auto-pay)
```

### Self-Hosted Deployment (docker-compose)
```
docker-compose.yml (one command to run entire platform):
  ├─ postgres:16 (persistent data volume)
  ├─ redis:7 (session + job queue)
  ├─ app:3000 (Express API backend)
  ├─ frontend:3001 (React/Next.js frontend, optional)
  └─ migrate (auto-runs Drizzle migrations on startup)

Features:
  • BYOK (bring-your-own-key) for all integrations
  • No data leaves the franchisee's machine
  • Can run on-premises or private cloud
  • Health checks built-in
  • Volume persistence for database
```

---

## Key Architectural Decisions

### Decision 1: Unified Database vs. Microservices
**Decision**: Unified PostgreSQL schema (Option A) for MVP.
**Rationale**: Faster to build, simpler to manage, easy to add ACID transactions.
**Revisit**: When one vertical has >1,000 concurrent users or different scaling needs.

### Decision 2: ORM: Drizzle vs. Prisma
**Decision**: **Drizzle ORM** (recommended over Prisma).
**Rationale**: Better type inference, explicit migration control, smaller bundle, proven by SeldonFrame.
**Tradeoff**: Smaller community than Prisma, but still well-documented.
**Implementation**: Follow SeldonFrame's pattern (Drizzle schema → auto-migrations → docker-migrate.sh)

### Decision 3: REST API vs. GraphQL
**Decision**: REST API (simple endpoint structure).
**Rationale**: Easier to paginate, cache, secure. No GraphQL N+1 complexity.
**Revisit**: If frontend needs complex nested queries or mobile bandwidth becomes issue.

### Decision 4: Self-Hosted vs. Managed Hosting
**Decision**: **Both** — Cloud (Fly.io/Vercel) for SaaS, Docker Compose for self-hosted.
**Rationale**: Franchisees need on-premises option for compliance + data sovereignty.
**Implementation**: Single codebase, docker-compose.yml in repo for franchisees.
**Benefit**: BYOK (Bring Your Own Key) — no third-party data access for sensitive verticals.

### Decision 5: Monolithic Backend vs. Modular (Blocks System)
**Decision**: Monolithic Express.js backend + **Blocks pattern** for vertical-specific logic.
**Rationale**: Single deployment, clean separation of concerns (franchise/catering/events blocks).
**Implementation**: `/src/blocks/franchise/`, `/src/blocks/catering/`, `/src/blocks/events/` directories.
**Pattern**: Blocks communicate via typed events (event registry), not direct imports.

### Decision 6: Event-Driven Communication
**Decision**: EventEmitter + event registry for block-to-block communication.
**Rationale**: Scales better than REST calls between modules, enables loose coupling.
**Implementation**: 
- Blocks emit events (e.g., `franchisee.royalty_calculated`)
- Event registry validates event schemas (TypeScript)
- Auto-generate event types from registry (like SeldonFrame's `emit:event-registry`)

### Decision 7: Real-Time vs. Polling
**Decision**: Server-sent events (SSE) for real-time updates (notifications, calendar changes).
**Rationale**: Simpler than WebSockets, good enough for MVP, easier to scale.
**Revisit**: If mobile app needs true bidirectional real-time (e.g., live collaboration).

---

## Security Considerations

- **Data at Rest**: Encrypted PostgreSQL backups, sensitive fields encrypted in database
- **Data in Transit**: TLS 1.3 everywhere, HTTPS only
- **Authentication**: Passwords hashed with bcrypt, MFA optional
- **API Security**: Rate limiting per user/IP, CORS for frontend
- **Compliance**: Audit logs for all data changes, ability to export/delete user data (GDPR)
- **Secrets**: Environment variables via managed secrets (Fly.io, Heroku, or HashiCorp Vault)
- **PCI Compliance**: Never store credit cards (use Stripe tokens), no raw payment data in logs

---

## Performance Targets

- **API Response Time**: <200ms for 95th percentile (p95)
- **Database Query Time**: <50ms for 95% of queries
- **Front-End Render**: <2 second initial load, <100ms interaction response
- **Uptime**: 99.5% (4.38 hours downtime/month acceptable for MVP)

---

## Scalability Plan (Year 1+)

**Phase 1 (Now - 3 months)**: Single server, monolithic backend
**Phase 2 (3-6 months)**: Load balancer, read replicas, CDN
**Phase 3 (6-12 months)**: Separate services if needed (franchise, catering, events), more aggressive caching
**Phase 4 (12+ months)**: Multi-region, advanced analytics, ML for predictions
