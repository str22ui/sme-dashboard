# Dashboard Admin - Production

Upload portal untuk NPL, KOL 2, dan Realisasi Harian PDFs.

## Deployment ke Vercel

1. Push ke GitHub
2. Import ke Vercel
3. Set Root Directory: `dashboard-admin`
4. Deploy!

Vercel akan otomatis create Blob storage.

## Setelah Deploy

1. Buka URL admin (e.g. https://your-admin.vercel.app)
2. Upload 3 PDFs
3. Dashboard NPL & KOL auto-update!

## Environment Variables

Tidak perlu setup - Vercel auto-create `BLOB_READ_WRITE_TOKEN`
