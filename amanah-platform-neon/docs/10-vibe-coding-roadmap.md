# Vibe Coding Roadmap — Neon Edition

## Pola Sesi

```text
baca konteks → inspeksi kode → analisis dampak → implementasi terbatas → migration → test → review → docs → commit
```

## Fase 0 — Guardrails

AGENTS, context, architecture, business rules, security, migration workflow, definition of done.

## Fase 1 — Foundation

- Refine + Vite + TS strict;
- Hono Vercel API;
- Drizzle + Neon;
- request ID;
- error envelope;
- health endpoint;
- custom data provider skeleton;
- lint/test/build.

## Fase 2 — Authentication

Pilih satu auth, login, logout, recovery, Google OAuth, protected API, session tests.

## Fase 3 — Multi-Tenant

Organizations, profiles, memberships, roles, permissions, relationships, active organization, isolation tests.

Jangan lanjut sebelum tenant isolation lulus.

## Fase 4 — Refine Data Provider

List, one, create, update, custom command, pagination, filter, error, credentials, active organization.

## Fase 5 — App Shell

Sidebar, topbar, switcher, table, form, status, loading/empty/error/denied, responsive.

## Fase 6 — Program Vertical Slice

Migration → API → authorization → Refine resource → UI → archive command → tests.

## Fase 7 — CRM and Beneficiary

Contacts, identifiers, addresses, tags, beneficiary/institution profiles, duplicate warning, privacy mapping.

## Fase 8 — Applications and Cases

Application, screening, case conversion, assignment, timeline, controlled status.

## Fase 9 — Assessment Engine

Template versions, sections, questions, answers, evidence, scoring, reviewer, self-approval prevention.

## Fase 10 — Approval Engine

Workflow versions, steps, requests, actions, revision, rejection, cancellation, transaction-safe command.

## Fase 11 — Funds

Commitment, receipt, restriction, allocation, disbursement, reversal, reconciliation, idempotency, concurrency tests.

## Fase 12 — Cash Distribution

Plan, assignment, execution, confirmation, evidence, verification, completion.

## Fase 13 — Procurement

Vendor, request, quotation, PO, goods receipt, invoice, payment reference.

## Fase 14 — Inventory

Products, units, warehouse, batch, movement, balance, reservation, opname, adjustment approval.

## Fase 15 — Aid Packages

Template, component, packing, actual batches, substitutions, unpack reversal.

## Fase 16 — Logistics

Shipment, courier, tracking, delivery, return, damage/loss incident.

## Fase 17 — Evidence Service

S3 client, upload intent, confirmation, signed download, metadata, classification, versioning, audit.

## Fase 18 — Kafalah

Sponsor, need, matching, contract, schedule, payment, distribution, monitoring, renewal.

## Fase 19 — Wakaf

Asset, legal document, nazhir, valuation, utilization, maintenance, income, benefit distribution.

## Fase 20 — Reports and Dashboard

Actionable reports dahulu, dashboard kemudian.

## Fase 21 — Audit and Risk

Audit log, risk flags, incident, complaint, corrective action, SLA.

## Fase 22 — Production Hardening

Tenant review, concurrency, rate limit, file security, observability, backup, staging, migration rehearsal, smoke tests.

Setiap fase harus lulus acceptance, migration test branch, authorization test, dan docs update.
