# Prompt — Authentication and Multi-Tenancy

Baca AGENTS dan docs Auth/Security.

Implementasikan satu auth system yang dipilih, lalu profiles, organizations, memberships, roles, permissions, membership_roles, role_permissions, organization relationships, active organization, invitation, permission resolver, auth middleware, tenant middleware, permission middleware.

Ketentuan:
- jangan hardcode role;
- jangan percaya organization ID browser;
- runtime DB role bukan table owner;
- semua query tenant scoped;
- organization switch membersihkan cache;
- invitation single-use dan expiry;
- tenant isolation tests wajib.

Jangan lanjut ke Program sampai isolation test lulus.
