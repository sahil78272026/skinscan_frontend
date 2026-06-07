# SkinScan Frontend

Mobile-first web application for cosmetic skin analysis.

## Tech Stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Framer Motion
- MediaPipe Face Mesh

## Local Development

1. Copy `.env.local.example` to `.env.local`
2. Configure API base URL (default `http://localhost:8000/api/v1`)
3. Install dependencies: `npm install`
4. Run dev server: `npm run dev`

## Deployment

Deploy on Vercel by importing the Next.js project. No serverless functions required (just standard Next.js frontend). Set `.env` variables accordingly.
