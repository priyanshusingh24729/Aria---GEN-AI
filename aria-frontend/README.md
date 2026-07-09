# Aria — Frontend (Phases 3 + 4)

Next.js 16 (App Router) frontend: Supabase-backed auth pages, plus the
four-mode interface (General Chat, Document Assistant, Image Generation,
SQL Assistant) wired to the Phase 2 FastAPI backend.

## Setup

1. Create a Supabase project (or use an existing one) and grab the URL +
   anon key from **Project Settings → API**.
2. Have the Phase 2 backend running (`python main.py` in `aria-backend/`,
   default `http://localhost:8000`).
3. `cp .env.example .env.local` and fill in the Supabase values and the
   backend's base URL.
4. `npm install`
5. `npm run dev` → http://localhost:3000

Visiting `/` while signed out redirects to `/login` automatically — that's
`src/proxy.ts` doing its job on every request.

## Auth pages (Phase 3)

- `/login` — email/password sign-in
- `/signup` — account creation, with an inline "check your inbox" state if
  your Supabase project requires email confirmation
- `/forgot-password` — sends a reset link
- `/update-password` — where the reset link lands, to set a new password
- `/auth/callback` — exchanges the code from email confirmation/reset links
  for a session (not user-facing)

## App modes (Phase 4)

- `/chat/general` — general chat, streamed over SSE from `/api/chat/general`
- `/chat/documents` — upload pdf/docx/txt/md/csv, then ask questions with
  retrieved sources shown per answer (`/api/documents/*`, `/api/chat/rag`)
- `/chat/images` — prompt to FLUX Schnell image, with a session history
  (`/api/images/generate`)
- `/chat/sql` — upload a db/sql/xlsx/csv file, then ask questions in plain
  English; shows the generated SQL, the result table, and a streamed
  explanation (`/api/sql/*`)

Each mode's state (messages, upload status, image history, SQL session)
lives in a React context mounted in `src/app/chat/layout.tsx`, so it
persists as you switch between modes — the same way the original
Streamlit app's `st.session_state` did.

## Notes

- Uses `@supabase/ssr` with cookie-based sessions (the current recommended
  pattern, no `auth-helpers`, no client-side-only tokens).
- `src/proxy.ts` is Next.js 16's renamed `middleware.ts`. If you're used to
  the old name: same logic, new filename, Next 16 doesn't run a file
  called `middleware.ts` at all.
- No user-scoping of documents/SQL sessions yet, matching the Phase 2
  backend decision to keep things single-user for now, anyone signed in
  shares the same document index and SQL sessions.
- `src/lib/api/client.ts` attaches the Supabase access token to every
  backend request already, so flipping `SKIP_AUTH=false` on the backend
  later needs zero frontend changes.
- Streaming responses are parsed by `src/lib/api/sse.ts`, a small parser
  matching the backend's exact `event: x` / `data: {...}` frame format.
