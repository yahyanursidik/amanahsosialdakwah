# Testing Strategy

## Prioritas

1. tenant isolation;
2. authentication;
3. authorization;
4. state transitions;
5. fund integrity;
6. stock integrity;
7. file access;
8. audit;
9. critical UI flow;
10. reporting.

## Unit

Zod, permission, transition, fund formula, stock formula, package calculation, privacy mapping, API error mapping.

## Integration

Unauthenticated, inactive membership, wrong tenant, missing permission, allowed request, invalid state, idempotent retry, error envelope, pagination/filter.

## Tenant Matrix

```text
User A / Org A / Record A → allowed
User A / Org A / Record B → denied
User B / Org B / Record A → denied
Scoped auditor Program A / Program B → denied
```

## E2E

```text
login → choose organization → program → contact → application → case → assessment → approval → allocation → distribution → evidence → verification → report
```

Gunakan Neon branch dengan data sintetik/anonymized untuk integration test.
