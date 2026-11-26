# Strategic Decision: Twenty Fork vs. From Scratch

## Executive Summary

**Two paths forward for your multi-vertical CRM:**

1. **Build on szCrm** (Twenty fork already running on NAS) — faster to market, proven foundation
2. **Build from scratch** (planned architecture) — cleaner separation, built for your specific verticals

This document analyzes the trade-offs for franchises, catering, and event booking.

---

## Path A: Build on szCrm (Twenty Fork)

### Strengths ✅

| Advantage | Impact | Vertical Fit |
|-----------|--------|--------------|
| **Already running** | 0 to Phase 1 in weeks, not months | All 3 |
| **Proven stack** | NestJS/React battle-tested, large community | All 3 |
| **Workflow engine** | Trigger/action automation built-in (partial) | Franchises, Catering |
| **Multi-tenant** | Workspace model ready (Twenty's model) | All 3 |
| **NAS deployment** | Already self-hosted on your infrastructure | Franchises (on-prem compliance) |
| **Email/Calendar sync** | Gmail/Outlook integration exists | Catering, Events |
| **Task management** | Built-in tasks, timeline, follow-ups | All 3 |
| **Extensibility** | Twenty apps pattern (modular apps system) | All 3 |
| **Zoho import** | Already done (CSV import worked) | Starting point |

### Weaknesses ❌

| Challenge | Impact | Vertical Fit |
|-----------|--------|--------------|
| **CRM-first design** | Not built for franchises (hierarchies), catering (logistics), events (ticketing) | All 3 |
| **Limited SMS/calling** | Phase 2 requires Twilio custom module | Catering (low priority), Events (medium) |
| **No event ticketing** | Not built for public booking + tickets + attendance | Events ❌ |
| **No royalty tracking** | Not built for franchise fees/revenue splits | Franchises ❌ |
| **No catering workflows** | Lead → Proposal → Execution → Invoice different from CRM | Catering ❌ |
| **Monolithic** | Hard to separate franchise/catering/events logic | All 3 (code gets messy) |
| **Upgrade path** | Forking Twenty means staying in sync with upstream (complex) | Technical debt |
| **No inventory** | Catering needs ingredient tracking, equipment mgmt | Catering ❌ |
| **No capacity planning** | Catering needs kitchen utilization, staff scheduling | Catering ❌ |
| **AI agents early** | Twenty has MCP agents, but not specialized for your verticals | All 3 |

### Effort to Add Each Vertical

**Franchise Systems** (Hard 🔴)
- Need: Territory mgmt, hierarchies, compliance reporting, royalty calculation
- Twenty has: Contacts, Companies (limited), custom fields
- Work: ~8-12 weeks to build territory module, royalty engine, compliance workflows
- Risk: High coupling with Twenty's data model

**Catering** (Very Hard 🔴🔴)
- Need: Lead → Proposal workflow, ingredient inventory, equipment tracking, cost calculation
- Twenty has: Pipeline (designed for sales, not events), tasks
- Work: ~12-16 weeks to build catering-specific modules (proposals, inventory, event prep)
- Risk: Very different UX from sales CRM (salespeople won't understand)

**Event Booking** (Very Hard 🔴🔴)
- Need: Public event page, ticket sales, attendee management, check-in, revenue tracking
- Twenty has: Contacts, tasks, no e-commerce
- Work: ~10-14 weeks to build public booking, ticket system, payment integration
- Risk: Twenty is internal tool; public-facing features require significant new UI

**Total Effort**: 30-42 weeks of custom development on top of Twenty

### Timeline (Path A)

```
Now: szCrm running (Phase 0 ✅)
Week 1-4: Franchise foundations (territories, org hierarchy)
Week 5-12: Franchise advanced (royalties, compliance)
Week 13-20: Catering basic (leads, proposals)
Week 21-28: Catering advanced (inventory, prep workflows)
Week 29-36: Event booking basic (event creation, ticketing)
Week 37-42: Event booking advanced (public pages, check-in, payments)

Month 10: Three verticals live (if all goes well)
Risk: Timeline slips easily due to Twenty's complexity
```

---

## Path B: Build from Scratch (Planned Architecture)

### Strengths ✅

| Advantage | Impact | Vertical Fit |
|-----------|--------|--------------|
| **Vertical-first design** | Built for franchises, catering, events from Day 1 | All 3 |
| **Blocks pattern** | Clean separation: `/franchise/`, `/catering/`, `/events/` | All 3 ✅ |
| **Express.js** | Simpler than NestJS, easier to understand | All 3 |
| **Drizzle ORM** | Type-safe migrations, explicit control | All 3 |
| **Docker Compose ready** | Self-hosted from Phase 0 | All 3 (franchisees on-prem) |
| **Event-driven** | Blocks communicate via events, not direct calls | All 3 |
| **Royalty engine** | Built-in from start (franchise needs) | Franchises ✅ |
| **Catering workflows** | Lead → Proposal → Execution → Invoice native | Catering ✅ |
| **Event ticketing** | Public booking + ticket sales + check-in native | Events ✅ |
| **Inventory management** | Built for catering (ingredients, equipment) | Catering ✅ |
| **Capacity planning** | Built for kitchen utilization, staff scheduling | Catering ✅ |

### Weaknesses ❌

| Challenge | Impact | Vertical Fit |
|-----------|--------|--------------|
| **Start from zero** | Takes 2-4 weeks to get Phase 0 foundation | All 3 |
| **Smaller community** | Express.js has docs, but less CRM-specific patterns | All 3 (manageable) |
| **Build everything** | No workflow engine, no email sync, no calendar sync pre-built | All 3 (work) |
| **Email/Calendar integration** | Must integrate SendGrid, Google Calendar from scratch | All 3 (6-8 weeks) |
| **SMS/Calling** | Must integrate Twilio from scratch | Catering, Events (6-8 weeks) |
| **Established patterns** | Not battle-tested at scale (but SeldonFrame proves concept) | All 3 (managed risk) |

### Effort to Add Each Vertical

**Franchise Systems** (Medium 🟡)
- Already designed into architecture (territories, hierarchies, royalties)
- Work: ~6-8 weeks (less than Twenty path because it's built-in)
- Risk: Low coupling, clean separation

**Catering** (Medium 🟡)
- Already designed into data model (leads, proposals, events, inventory)
- Work: ~8-10 weeks (less than Twenty path because not retrofitted)
- Risk: Low coupling, UX optimized for catering

**Event Booking** (Medium 🟡)
- Already designed (events, tickets, attendees, revenue tracking)
- Work: ~6-8 weeks (less than Twenty path because not retrofitted)
- Risk: Low coupling, public-facing UX from start

**Plus: Core features** (4-6 weeks)
- Email templating, notifications, auth, payments
- These are assumed in planned architecture

**Total Effort**: 30-42 weeks, but distributed differently (core 4-6 weeks, then verticals in parallel or sequence)

### Timeline (Path B)

```
Week 1-2: Phase 0 foundation (Drizzle, Docker, auth, events registry)
Week 3-10: Event Booking MVP (fastest to market, proves pattern)
Week 11-18: Catering MVP (reuses foundation, can run parallel with week 3-10)
Week 19-26: Franchise MVP (reuses foundation)
Week 27-34: Integration & refinement (all verticals together)
Week 35+: Scaling, optimizations

Month 8: Three verticals live (cleaner, faster than Twenty path)
Risk: Lower risk because built-in separation; each vertical can launch independently
```

---

## Comparison Matrix

| Factor | szCrm (Twenty Fork) | From Scratch (Planned) |
|--------|---------------------|----------------------|
| **Time to MVP (all 3 verticals)** | 30-42 weeks | 26-34 weeks |
| **Time to Event Booking launch** | 10-14 weeks | 6-10 weeks |
| **Time to Catering launch** | 20-28 weeks | 8-10 weeks (parallel) |
| **Time to Franchise launch** | 30-36 weeks | 19-26 weeks (parallel) |
| **Vertical separation** | Hard (monolithic) | Easy (blocks) |
| **Code complexity** | High (retrofitting) | Medium (built-in) |
| **Self-hosting** | Already done ✅ | Docker Compose ✅ |
| **Community/support** | Large (Twenty) | Smaller (follow SeldonFrame) |
| **Upgrade burden** | High (fork maintenance) | None (your codebase) |
| **Royalty tracking** | Custom build (hard) | Built-in (easy) |
| **Catering workflows** | Custom build (very hard) | Built-in (easy) |
| **Event ticketing** | Custom build (very hard) | Built-in (easy) |
| **Learning curve** | NestJS (steeper) | Express.js (gentler) |
| **Parallelization** | Hard (monolithic) | Easy (independent blocks) |
| **Long-term maintenance** | Keep syncing with Twenty | Own codebase |

---

## Vertical-by-Vertical Analysis

### Franchise Systems

**szCrm (Twenty fork)**:
- ❌ No territory management (need to build)
- ❌ No royalty calculation (need to build)
- ❌ No compliance reporting workflows (need to build)
- ✅ Good: Can use Companies + custom fields for franchisees
- Effort: 8-12 weeks
- Risk: High (complex business logic in CRM not designed for it)

**From Scratch**:
- ✅ Territory model built-in from Phase 0
- ✅ Royalty calculation engine built-in
- ✅ Compliance workflows part of design
- ✅ Organization hierarchy designed for franchisees
- Effort: 6-8 weeks (implementation only, not architecture)
- Risk: Low (design already proven by planning docs)

**Winner**: From Scratch (cleaner, faster, lower risk)

---

### Catering

**szCrm (Twenty fork)**:
- ✅ Can use Pipeline for leads
- ❌ No proposal generation (need to build)
- ❌ No ingredient inventory (need to build)
- ❌ No equipment tracking (need to build)
- ❌ No capacity planning (need to build)
- ❌ No cost tracking per event (need to build)
- ✅ Can use Tasks for event day prep
- Effort: 12-16 weeks (substantial custom work)
- Risk: Very high (catering workflows very different from CRM sales)
- UX Pain: Salespeople dashboard ≠ Operations/catering dashboard

**From Scratch**:
- ✅ Lead → Proposal workflow built-in
- ✅ Ingredient inventory module designed
- ✅ Equipment tracking designed
- ✅ Capacity planning designed
- ✅ Cost per event calculation designed
- ✅ Operations-focused UX from start
- Effort: 8-10 weeks (implementation, design ready)
- Risk: Low (architecture proven)
- UX Gain: Catering-optimized dashboard, not sales CRM repurposed

**Winner**: From Scratch (much less work, better UX, lower risk)

---

### Event Booking

**szCrm (Twenty fork)**:
- ❌ No public event pages (need to build)
- ❌ No ticket sales/e-commerce (need to build)
- ❌ No attendee check-in (need to build)
- ❌ No Stripe integration (need to build)
- ❌ No public-facing event URL (need to build)
- ✅ Can use Contacts for attendees
- ✅ Can use Tasks for follow-ups
- Effort: 10-14 weeks (substantial new features)
- Risk: Very high (Twenty is internal tool, public-facing features a stretch)
- UX Challenge: Twenty's internal-tool design ≠ public event page

**From Scratch**:
- ✅ Public event pages designed
- ✅ Ticket sales + Stripe built-in
- ✅ Attendee check-in designed
- ✅ QR code/mobile tickets designed
- ✅ Revenue tracking designed
- ✅ Public-facing UX from start
- Effort: 6-8 weeks (implementation, design ready)
- Risk: Low (architecture proven)
- UX Gain: Purpose-built event booking, not CRM repurposed

**Winner**: From Scratch (much less work, better UX, purpose-built)

---

## Decision Framework

**Choose szCrm (Twenty Fork) IF:**
- ✅ You want to launch **sales reps first** and add franchises/catering/events later
- ✅ You have **spare NestJS/Twenty expertise** on your team
- ✅ You want to **stay close to Twenty's community** and roadmap
- ✅ Your primary use case is still **sales CRM** (franchises are secondary)
- ✅ You're OK with **technical debt** from retrofitting

**Choose From Scratch IF:**
- ✅ You want **franchises, catering, and events equally** from Day 1
- ✅ You want **clean separation** between verticals (no code tangles)
- ✅ You want **each vertical optimized** for its use case
- ✅ You prefer **Express.js simplicity** over NestJS complexity
- ✅ You want **independent scaling** (launch each vertical separately)
- ✅ You want **lower long-term maintenance** (own codebase, no upstream sync)

---

## My Recommendation

**Build from scratch**, for these reasons:

1. **Catering & Events are NOT CRM features** — They're fundamentally different workflows (logistics, ticketing, capacity planning). Retrofitting into a sales CRM creates permanent pain.

2. **Vertical separation matters** — Franchisees, catering ops, and event organizers have nothing in common UX-wise. Clean blocks architecture lets each optimize independently.

3. **Timeline is actually better** — 26-34 weeks vs. 30-42 weeks, AND each vertical can launch independently (event booking in week 6-10, not week 10-14).

4. **Maintenance burden** — Forking Twenty means staying in sync with upstream changes. Your codebase means full control.

5. **szCrm can become the "sales team dashboard"** — If you ever need sales reps again, you already have a working Twenty instance on the NAS. From-scratch doesn't replace it; complements it.

---

## Hybrid Option (Not Recommended)

**Could you keep szCrm AND build from scratch?**

Technically yes: szCrm handles sales/CRM tasks, new platform handles franchises/catering/events. But:
- ❌ Two databases, two UIs, two codebases to maintain
- ❌ Franchisees see fragmented experience
- ❌ Integration complexity (SSO, shared contacts, etc.)
- ❌ Not worth it

Better: Archive szCrm, use knowledge to build from scratch fast.

---

## Next Steps

### If you choose **From Scratch**:
1. ✅ My 7 planning docs are ready (keep them)
2. Use szCrm roadmap as inspiration for catering/events phases
3. Start Phase 0 (foundation) immediately
4. Optionally: Keep szCrm running on NAS as sales team tool (don't replace it)

### If you choose **szCrm**:
1. ❌ Discard my planning docs (different approach)
2. ✅ Use my research on verticals to design Twenty app extensions
3. Plan 30-42 week roadmap for custom franchise/catering/events modules
4. Prepare for code complexity (everything will be tightly coupled)

### If you want **more analysis**:
- Deep dive on any vertical
- Cost/benefit per week of development
- Team skill requirements (NestJS vs. Express)
- Risk mitigation strategies

---

## Summary Table

| Metric | szCrm | From Scratch | Winner |
|--------|-------|-------------|--------|
| Time to market (all 3) | 30-42 wks | 26-34 wks | From Scratch 🟢 |
| Franchise ease | Hard | Medium | From Scratch 🟢 |
| Catering ease | Very Hard | Medium | From Scratch 🟢 |
| Events ease | Very Hard | Medium | From Scratch 🟢 |
| Self-hosting | Ready | Docker | Tie 🟡 |
| Team expertise (NestJS) | Advantage | Disadvantage | szCrm 🟡 |
| Vertical separation | Poor | Good | From Scratch 🟢 |
| Long-term maintenance | Complex | Simple | From Scratch 🟢 |
| Community support | Large | Small | szCrm 🟡 |

**Recommendation: From Scratch** (5 wins vs. 1 tie + 1 win for szCrm)
