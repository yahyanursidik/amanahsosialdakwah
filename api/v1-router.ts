// Semua `/api/v1/*` di-rewrite ke fungsi ini (lihat vercel.json) karena
// catch-all `api/v1/[...route]` tidak mencocokkan path bertingkat di Vercel.
// Artefak dibuat oleh `npm run build:api` sebelum Vercel melakukan file tracing.
export { default } from "../server/build-output/index.mjs";
