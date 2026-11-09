# Ramkee Print Services — V2

Mobile-first upload and print-price preview website.

## What this version does
- Accepts multiple PDF, JPG, PNG and DOCX files.
- Converts each DOCX to PDF on the server using CloudConvert, then previews every resulting PDF page with PDF.js.
- Keeps scanned pages, embedded pictures and signatures as images; **no OCR is used**.
- Calculates page count and estimate for B&W (₹2/page) or colour (₹8/page), with 1–20 copies.
- Single-sided printing only in this version.

## Important: conversion service setup
DOCX-to-PDF conversion requires a CloudConvert API key. The key must stay on the server, not in `index.html`.

1. In Supabase, open project `xruqkwiptaimycnizrud`.
2. Deploy the Edge Function in `supabase/functions/convert-docx` named `convert-docx`.
3. Add the Supabase Edge Function secret `CLOUDCONVERT_API_KEY` with your CloudConvert API key.
4. In `index.html`, replace `PASTE_SUPABASE_ANON_KEY_HERE` with the project's anon/public key from Supabase Project Settings → API.
5. Publish the repository with GitHub Pages.

CloudConvert usage may be chargeable after any free allowance. Check its current plan/pricing before accepting customer documents. Do not expose the CloudConvert API key in GitHub.

## Deploy the function with Supabase CLI
From the repository folder, after installing and logging in to Supabase CLI:

```bash
supabase link --project-ref xruqkwiptaimycnizrud
supabase secrets set CLOUDCONVERT_API_KEY=YOUR_CLOUDCONVERT_API_KEY
supabase functions deploy convert-docx --no-verify-jwt
```

This initial preview version does not collect payment, store customer orders, or send jobs to Epson. Those integrations must be added before taking paid orders.
