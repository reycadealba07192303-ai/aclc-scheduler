# Project architecture

The admin and student web portals use the Next.js App Router. Teacher workflows are also available in the native Flutter app under `mobile/`; both clients use the Next.js API and the same MongoDB backend.

```text
mobile/                           Flutter teacher app (native Android + iOS)
src/
├── app/                         # Next.js routes, layouts, and API route handlers
│   ├── admin/                   # Admin screens
│   ├── teacher/                 # Teacher screens
│   └── api/                     # HTTP endpoints; delegate to backend modules
├── frontend/                    # Browser-facing React code
│   ├── components/              # Shared UI and feature components
│   └── context/                 # Client state and API-backed stores
├── backend/                     # Server-only application code
│   ├── auth/                    # Passwords, sessions, authorization
│   ├── database/                # MongoDB connection
│   ├── mail/                    # SMTP delivery
│   ├── models/                  # Mongoose models
│   ├── services/                # Scheduling and curriculum logic
│   └── validation/              # Server input schemas
└── shared/                      # Modules safe to import from either side
    ├── constants.ts
    ├── lib/                     # Time formatting and style helpers
    └── types/
```

## Dependency direction

```text
Browser UI → Next.js API routes → backend services → models/database/external services
      └──────────────────────── shared types and utilities ──────────────────────┘
```

- Keep page and API entry files under `src/app` so Next.js can discover routes.
- The Flutter app communicates through authenticated Next.js API routes and never connects directly to MongoDB.
- Put reusable browser UI in `src/frontend`; frontend code calls the API and does not import database models, credentials, or server-only services.
- Put persistence and private integrations in `src/backend`; route handlers are the HTTP boundary for these modules.
- Put only environment-independent helpers and shared data definitions in `src/shared`.
- Root-level Next.js configuration, `proxy.ts`, and package files stay at the project root. The safe `.env.example` template stays there; private values live in the ignored `src/backend/.env`, which `next.config.ts` loads before app startup.
