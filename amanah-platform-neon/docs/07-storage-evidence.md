# Storage and Evidence

## Keputusan

Neon menyimpan metadata, bukan binary file. Gunakan S3-compatible private object storage, termasuk opsi seperti Contabo Object Storage, Cloudflare R2, atau AWS S3.

## Server Variables

```env
S3_ENDPOINT=
S3_REGION=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=
```

## Upload Flow

```text
request upload intent
→ validate user/tenant/entity/file
→ create pending metadata
→ return signed upload URL
→ direct upload
→ confirm
→ verify object
→ mark available
```

## Download Flow

```text
request file
→ auth
→ tenant/permission/classification check
→ optional access audit
→ short-lived signed URL
```

## Object Key

```text
organizations/{organizationId}/{classification}/{entityType}/{entityId}/{fileId}/{version}/{safeName}
```

Jangan gunakan nama penerima atau nomor identitas dalam key.

Evidence submitted tidak boleh dioverwrite. Koreksi membuat versi baru.

Publikasi adalah command terpisah yang memeriksa consent, redaction/anonymization, permission, dan approval.
