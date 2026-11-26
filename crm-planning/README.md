# Multi-Vertical CRM Platform Planning

**Project**: GoHighLevel-style CRM for Franchises, Catering, and Event Booking  
**Branch**: `claude/crm-franchises-catering-events-51x2ne`  
**Status**: Planning Phase  

---

## Overview

Building a single CRM platform supporting three distinct business models:
1. **Franchise Systems** (B2B, recurring, multi-level)
2. **Catering** (Project-based, logistics-heavy)
3. **Event Booking** (Funnel-driven, calendar-centric)

This directory contains the research, architecture, and roadmap needed before development begins.

---

## Navigation

- **[01-vertical-requirements.md](./01-vertical-requirements.md)** — Detailed feature & workflow research for each vertical
- **[02-feature-matrix.md](./02-feature-matrix.md)** — Overlaps, gaps, and priority features
- **[03-architecture.md](./03-architecture.md)** — Tech stack, data models, API design
- **[04-phased-roadmap.md](./04-phased-roadmap.md)** — MVP definition, release sequence, timeline
- **[05-risk-assessment.md](./05-risk-assessment.md)** — Known challenges & mitigations per vertical

---

## Quick Reference: Three Verticals at a Glance

### 🏢 Franchise Systems
**Model**: Multi-tenant, hierarchical, recurring revenue  
**Key Users**: Franchisor (HQ) → Franchisees (units) → Store staff  
**Pain Points**: Unit performance tracking, compliance reporting, lead distribution  
**Revenue Drivers**: Volume deals, territory management, performance incentives  

### 🍽️ Catering
**Model**: Project-based, event-driven, seasonal spikes  
**Key Users**: Sales (proposals) → Operations (scheduling) → Kitchen (prep) → Delivery  
**Pain Points**: Cost per event, ingredient sourcing, capacity constraints  
**Revenue Drivers**: Margin per event, upsells (bar, desserts), recurring clients  

### 📅 Event Booking
**Model**: Funnel-driven, point-of-sale, fundraiser-specific  
**Key Users**: Organizer (event setup) → Attendees (booking) → Store (fulfillment)  
**Pain Points**: Real-time capacity, payment collection, donor tracking  
**Revenue Drivers**: Commission per ticket, premium event types, add-ons  

---

## Next Steps

1. **Read each vertical research** (01-vertical-requirements.md) — understand specific workflows
2. **Review the feature matrix** (02-feature-matrix.md) — identify shared vs. unique needs
3. **Approve architecture** (03-architecture.md) — validate tech choices and data model
4. **Commit to roadmap** (04-phased-roadmap.md) — decide MVP scope and launch order
5. **Plan mitigation** (05-risk-assessment.md) — prepare for known gotchas

---

## Key Decisions Pending

- [ ] **Tech Stack**: Node.js + PostgreSQL + React? Or different choice?
- [ ] **Data Model**: Unified schema with feature flags, or separate DBs with API sync?
- [ ] **MVP Vertical**: Which vertical ships first to validate core patterns?
- [ ] **Timeline**: Weeks to launch? Months?
- [ ] **Team**: Solo? Engineers + domain specialists?

These will be locked down in the architecture document.
