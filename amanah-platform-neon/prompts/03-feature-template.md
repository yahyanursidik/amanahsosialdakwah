# Prompt Template — One Feature

Baca AGENTS, docs domain, schema, migration, API, service, repository, tests, dan komponen terkait.

## Tugas
[TULIS SATU FITUR]

## Business Rules
[ATURAN]

## Acceptance Criteria
[KRITERIA]

## Scope Limits
[BATASAN]

Sebelum coding: ringkas existing implementation, cari duplikasi, sebutkan file, database impact, auth/tenant impact, concurrency risk, tests.

Implementasikan vertikal:

```text
migration → schema → repository → service → API → Refine mapping → UI → tests → docs
```

Jangan query Neon dari browser, mengirim raw DB row, melemahkan tenant scope, generic update untuk workflow, hard delete, atau refactor di luar scope.
