# Reference Architecture Analysis: GoHighLevel Alternatives

## Summary

Analyzed **SeldonFrame** (69 ⭐), the most popular GoHighLevel-alternative on GitHub, plus architectural patterns from **open-agency-os** and **GoHyperLevel**. This document compares their approaches with our planned architecture.

---

## SeldonFrame: Key Findings

### Tech Stack
| Layer | Choice | Notes |
|-------|--------|-------|
| **Frontend** | Next.js (full-stack) | Dashboard + public websites + API all in one App |
| **Backend** | Next.js API routes | Serverless-ready, deployed alongside frontend |
| **Database** | PostgreSQL 16 + Drizzle ORM | Not Prisma (unlike our initial rec) |
| **Package Manager** | pnpm (monorepo) | Turbo for workspace management |
| **Auth** | Not visible in public files | Likely SSO + session-based |
| **Deployment** | Docker Compose (self-hosted) | Includes Neon HTTP proxy for serverless compatibility |
| **Infrastructure** | Neon Postgres + local HTTP proxy | Elegant solution for serverless driver compatibility |

### Architecture Decisions

**Monorepo Structure** (Strengths → Our Plan):
```
seldonframe/
├── packages/
│   ├── crm/              (main app)
│   ├── core/             (shared utilities)
│   ├── cli/              (command-line tools)
│   ├── payments/         (payment integration)
│   └── ...
└── skills/
    └── mcp-server/       (MCP integration)
```
✅ **Matches our unified backend + frontend recommendation**  
✅ Separates concerns (payments, CLI) into packages  
⚠️ We'd add a `/agencies` or `/verticals` package for franchise-specific logic

**Blocks System** (Modular Features):
```
/packages/crm/src/blocks/
├── booking/           (reservation system)
├── crm/               (contact management)
├── intake/            (lead capture)
├── services/          (service catalog)
└── vehicle-service-history/  (HVAC-specific)
```
✅ **Exactly matches our vertical-specific module approach**  
✅ Each block is independently deployable  
⚠️ They specialize in HVAC/services; we need franchise, catering, events

**Event-Driven Architecture**:
- They have `emit:event-registry` (auto-generated event types)
- Suggests: blocks communicate via typed events, not direct calls
✅ **Scales better than our REST-only approach for Phase 0**  
→ Recommendation: Add EventEmitter to our Phase 0 plan

**Database Layer**:
- Uses Drizzle ORM (not Prisma)
- Migrations in `/packages/crm/drizzle/`
- Idempotent Docker migrations in `docker-migrate.sh`
✅ **More database-agnostic than Prisma**  
→ Consider switching from Prisma to Drizzle in our plan

---

## Data Model Approach: Comparison

### SeldonFrame's Pattern
```typescript
// They likely have:
- Workspace (multi-tenant root)
  ├─ Contacts
  ├─ Bookings (time-based)
  ├─ Intakes (lead funnel)
  ├─ Services (service catalog)
  └─ Custom blocks (vertical-specific)
```

### Our Planned Pattern (Updated)
```
Organization (franchisor, catering business, or nonprofit)
├─ Franchise-specific:
│  ├─ Franchisees (extends org)
│  ├─ Territories
│  ├─ Agreements
│  └─ Compliance Reporting
├─ Catering-specific:
│  ├─ Leads
│  ├─ Proposals
│  ├─ Events (bookings)
│  ├─ Ingredients
│  └─ Menus
└─ Event-specific:
   ├─ Events (public bookings)
   ├─ Tickets
   ├─ Attendees
   └─ Revenue Tracking
```

**Difference**: SeldonFrame has shared "Contacts → Bookings → Services" flow; we need separate data models per vertical (franchises don't need "bookings" in the same way catering does).

---

## Infrastructure & Deployment

### SeldonFrame Approach
```yaml
docker-compose.yml:
  - postgres:16 (persistent data)
  - neon-proxy:4444 (serverless driver translation)
  - app:3000 (Next.js)
  - migrate (schema initialization)
```

**Why the proxy?**: Neon is serverless-first, uses HTTP. Their proxy translates HTTP → TCP for local Postgres.

### Our Planned Approach (Updated)
```yaml
docker-compose.yml:
  - postgres:16 (persistent data)
  - redis:6 (session + job queue)
  - app:3000 (Express/Node.js backend)
  - app:3001 (React frontend via Vite)
  - migrate (Drizzle migrations)
```

**Tradeoff**: 
- ✅ SeldonFrame's Next.js approach is simpler (one deployment)
- ❌ Our separate backend/frontend is more flexible for scaling
- → **Recommendation**: Keep Express backend separate, but consider Next.js for frontend to reduce deployments

---

## Code Organization Insights

### Testing Strategy
SeldonFrame has:
- `/tests/unit/` — Component/function tests
- `/tests/integration/` — Multi-component workflows
- `/tests/regression/` — Known bug prevention
- `/tests/e2e/` — End-to-end workflows
- `/e2e/` — Playwright E2E tests

**Our Plan**: Matches this exactly (jest + Playwright). ✅

### Database Migration Strategy
```bash
pnpm db:generate   # Generate types from schema
pnpm db:migrate    # Run pending migrations
pnpm db:push       # Push schema changes (dev only)
pnpm db:seed       # Populate test data
```

**Insight**: Separate generation → migration → push workflow prevents schema/type mismatches.

**Our Update**: If switching to Drizzle, use this exact pattern.

---

## What SeldonFrame Does Well

| Feature | Implementation | Relevance to Our CRM |
|---------|-----------------|----------------------|
| **Self-hosted** | Docker Compose in repo | ✅ Yes — franchisees want on-prem option |
| **Event-driven blocks** | emit:event-registry scripting | ✅ Yes — scales for 3 verticals |
| **Full-stack in one** | Next.js dashboard + API + websites | ⚠️ Partially — they don't separate frontend/backend |
| **Monorepo** | Turbo + pnpm | ✅ Yes — exactly what we want |
| **Database agnostic** | Drizzle + migrations | ✅ Yes — better than Prisma for our case |
| **Multi-tenant** | Workspace root | ✅ Yes — similar to our Organizations model |

### What SeldonFrame Does Poorly (for Our Use Case)

| Gap | SeldonFrame | We Need |
|-----|------------|---------|
| **Vertical diversification** | HVAC/Services focused | Franchises, Catering, Events |
| **Royalty tracking** | Not apparent | Franchisee royalty calculation |
| **Compliance reporting** | Not apparent | Franchise compliance workflows |
| **Catering workflows** | Only "services" + "booking" | Lead → Proposal → Execution → Invoice |
| **Public ticket sales** | Booking is private | Public event ticketing (fundraisers) |
| **Integration marketplace** | Not visible | POS, E-signature, SMS, Email, Stripe |

---

## Updated Tech Stack Recommendation

Based on SeldonFrame analysis:

| Component | Original Rec | Updated Rec | Rationale |
|-----------|--------------|-------------|-----------|
| **Backend Runtime** | Node.js + Express | Node.js + Express | ✅ Keep — better for our API complexity |
| **Frontend Framework** | React + Vite | Next.js (optional) | Could use Next.js frontend to match SeldonFrame pattern |
| **Database ORM** | Prisma | **Drizzle** | ✅ Better type safety + migration control |
| **Monorepo** | Turbo + pnpm | Turbo + pnpm | ✅ Confirmed approach |
| **Auth** | JWT | JWT | ✅ Keep for simplicity |
| **Deployment** | Vercel + Fly.io | **Docker Compose** | ✅ Add self-hosted option (key for franchisees) |
| **Database** | PostgreSQL | PostgreSQL 16 | ✅ Confirmed |
| **Job Queue** | Bull (Redis) | Bull (Redis) | ✅ Keep for email, notifications |
| **Testing** | Jest + Playwright | Jest + Playwright | ✅ Confirmed |

---

## Architecture Updates for Phase 0

### New Decision: Drizzle vs Prisma

**Drizzle Advantages**:
- ✅ Full type inference (no code generation step)
- ✅ Edge-ready (same as Prisma)
- ✅ Better for migrations (more explicit control)
- ✅ Smaller bundle size
- ✅ Used by SeldonFrame successfully

**Prisma Advantages**:
- ✅ Studio for visual browsing
- ✅ More documentation/tutorials
- ✅ Larger community

**Recommendation**: **Switch to Drizzle** for our MVP. Copy SeldonFrame's db pattern.

### New Decision: Add Docker Compose for Self-Hosting

**Phase 0 Update**:
```yaml
# Add to local development setup:
docker-compose.yml (for dev and franchisee self-hosting)
  - postgres:16
  - redis:7
  - api:3000
  - frontend:3001 (or 3000 if Next.js)
  - migrate (auto-run)
```

**Benefit**: Franchisees can run the entire platform locally if desired (BYOK compliance).

---

## Other Reference Implementations (Quick Notes)

### open-agency-os (16 ⭐)
- **Stack**: Python/Django backend (not Node!)
- **Focus**: Self-hosted, SMS + Email automation
- **Lesson**: Not all GHL alternatives use Node.js — but Python adds complexity for our team
- **Skip**: Unless we need advanced SMS/email (which we outsource to SendGrid)

### GoHyperLevel (14 ⭐)
- **Stack**: Likely Node.js (not inspected, but marketed as "unlimited users, 0€ per seat")
- **Focus**: Business OS for AI agents (MCP + REST API)
- **Lesson**: MCP integration is becoming standard for AI-driven CRMs
- **Insight**: Our phase 3 (AI agents for franchisees) should plan for MCP integration from Phase 0

---

## Recommended Phase 0 Updates

### 1. **Switch to Drizzle ORM**
- Update `03-architecture.md`: Drizzle instead of Prisma
- Benefit: Full type safety, better migrations

### 2. **Add Docker Compose for Self-Hosting**
- Create `docker-compose.yml` template in Phase 0
- Add `scripts/docker-migrate.sh` (like SeldonFrame)
- Benefit: Franchisees can self-host

### 3. **Plan Event-Driven Architecture**
- Add to Phase 0: EventEmitter + event registry pattern
- Benefit: Scales for 3 verticals + future integrations

### 4. **MCP Support from Day 1**
- Include MCP server skeleton in Phase 0
- Benefit: Future AI agents can hook into CRM (phase 3)

### 5. **Blocks/Modules System**
- Phase 0: Create `/packages/crm/src/blocks/` structure
- Phase 1: One block per vertical
- Benefit: Clean separation of franchise/catering/events logic

---

## File Structure (Updated)

```
crm-root/
├── packages/
│   ├── api/
│   │   ├── src/
│   │   │   ├── blocks/
│   │   │   │   ├── franchise/      (Phase 3)
│   │   │   │   ├── catering/       (Phase 2)
│   │   │   │   ├── events/         (Phase 1)
│   │   │   │   └── shared/         (all phases)
│   │   │   ├── db/
│   │   │   │   ├── schema.ts       (Drizzle schema)
│   │   │   │   └── migrations/     (auto-generated)
│   │   │   ├── events/             (event bus)
│   │   │   ├── lib/                (utilities)
│   │   │   └── routes/             (Express routes)
│   │   ├── drizzle/                (migrations)
│   │   └── docker-migrate.sh
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   └── lib/
│   │   └── package.json
│   └── core/                        (shared types)
├── docker-compose.yml
├── CLAUDE.md                        (updated)
└── crm-planning/                    (this folder)
```

---

## Risk Mitigation from SeldonFrame Review

| Risk | SeldonFrame's Approach | Our Mitigation |
|------|------------------------|-----------------|
| **Scalability** | Single Next.js process | Separate API/frontend + load balancing in Phase 2 |
| **Vertical specialization** | HVAC-focused | Explicit blocks per vertical from Phase 0 |
| **Database migrations** | Embedded in app | Separate migration runner (docker-migrate.sh pattern) |
| **Multi-tenancy** | Workspace model | Organization + tenant isolation from Phase 0 |
| **Event coupling** | Could get messy | Strict event schema + registry from Phase 0 |

---

## Next Steps

1. ✅ **Update `03-architecture.md`**: Replace Prisma with Drizzle, add Docker Compose
2. ⬜ **Create `/packages` structure** in Phase 0
3. ⬜ **Scaffold first block** (events) during Phase 1A
4. ⬜ **Document block pattern** in CLAUDE.md
5. ⬜ **Plan MCP integration** for Phase 3

---

## References

- **SeldonFrame**: https://github.com/seldonframe/seldonframe (69 ⭐)
- **open-agency-os**: https://github.com/SahibYar/open-agency-os (16 ⭐)
- **GoHyperLevel**: https://github.com/BAISESYSTEMS/GoHyperLevel (14 ⭐)
- **Drizzle Docs**: https://orm.drizzle.team
- **Turbo Docs**: https://turbo.build/repo/docs
