# ACLC Classroom Scheduler — Comprehensive Guide

Single source of truth for what this system is, where it stands today, and the
ordered task list to make it a working product. Update this file whenever a task
is finished or a decision is made.

---

## 1. Purpose and scope

Web and mobile system for scheduling classes and recording attendance. Scheduling,
student enrollment, teacher attendance sessions, and student QR check-ins are
connected; reports and manual attendance correction remain future work.

| In scope | Out of scope (separate system, later) |
| --- | --- |
| Programs, term-based sections, subjects, rooms, academic terms, student roster import | Attendance reports and exports (planned) |
| Weekly class schedule with conflict checks, teacher-managed attendance sessions, student QR check-in and history | Manual attendance correction and audit trail (planned) |
| Super Admin portal (full CRUD) | |
| Teacher and student portals, professor, student, and admin accounts | |

**Users**

- **Super Admin** — sets up programs, sections, subjects, rooms, and professors;
  builds the weekly schedule.
- **Teacher** — uses the Flutter mobile app to view active-term handled sections, open/close attendance, scan students' rotating QR codes, and monitor check-ins. The existing web teacher portal remains during the mobile rollout.
- **Student** — signs in with their registered school email and sees only their own enrollment and classes.

The earlier mock attendance UI remains in `archive/qr-attendance/` as a reference;
the live attendance feature uses database-backed student accounts and attendance APIs.

---

## 2. Current status (snapshot)

Terms, programs (including imported curriculum), subjects, rooms, professors,
administrator profiles, sections, and schedule slots now load from and save to
MongoDB through API routes. Section subject assignments are derived from saved
schedules. Email/password login and role checks are implemented; the first
administrator must be created through the one-time setup flow.

| Area | Status |
| --- | --- |
| Setup (Terms / Subjects / Rooms) | UI and API connected to MongoDB |
| Programs → curriculum and term sections | Programs, curriculum, and term sections persist in MongoDB |
| Schedule calendar (active-term overview, weekly + classroom view) | UI and MongoDB API connected; add, edit, delete, and server-side conflict checks |
| Section detail (clickable weekly grid + professor per subject) | UI and MongoDB API connected; schedule slots persist and can be edited or deleted |
| Users (professors / admins, View info with teaching load) | UI and API connected to MongoDB |
| Teacher portal (Handled classes, weekly schedule, Classrooms) | Uses the signed-in teacher profile; shows assigned active-term classes and times and exports them as PDF |
| Teacher Flutter app | Native login, Overview/Handled classes/Profile navigation, start/close attendance, student QR scanner, and live check-in roster; uses the same role-checked APIs |
| Student portal | Uses the signed-in student's term enrollment; displays section, classes, times, teacher, modality, room, personal 10-second rotating attendance QR, and check-in history |
| QR attendance | Teachers open/close sessions for their own classes and scan a student's signed 10-second QR in the Flutter app. The server verifies expiry, teacher/session ownership, student status, enrollment, and duplicate check-ins. |
| Dashboard (counts, today's classes, setup checklist) | Done, reads in-memory store |
| TypeScript + `npx next build` | Production build passes after authentication changes; lint not rerun |
| Database (term-aware models, connection, Setup, Program, User, Section, and Schedule CRUD) | **Done** — local MongoDB; sample setup data cleared |
| API | Setup, Program, user, section, and schedule CRUD; schedule conflict validation runs on the server |
| Auth | Email/password, hashed passwords, signed httpOnly sessions, one-time first-admin setup, email/student-number sign-in, teacher/student email OTP setup and password reset, explicit delivery/cooldown responses, and role checks are implemented |
| Tests | Not started |

---

## 3. Tech stack

| Layer | Now | Target |
| --- | --- | --- |
| Framework | Next.js 16.3 (App Router), React 19, TypeScript | same |
| Teacher mobile client | Flutter (Android + iOS), secure token storage, authenticated API client, QR scanner | same |
| Styling | Tailwind CSS 4, tokens in `src/app/globals.css` | same |
| PDF export | jsPDF client-side schedule export for Teacher portal | same |
| State | React Context (`src/frontend/context/AcademicStore.tsx`); role-specific portal data loads after session verification | Context backed by API calls |
| Auth | scrypt password hashes; signed JWT session cookie; server-side account/status checks; role checks in Proxy and API handlers | Add account recovery and production rate limiting |
| Data | Setup, Programs, Users, Sections, and Schedules: MongoDB API; section assignments are derived from saved schedules. MongoDB (local) + Mongoose 9 | MongoDB (Atlas in production) |
| Validation | form `required` attributes only (Zod 4 installed) | Zod (server is source of truth) |
| Tests | none | Vitest |
| Auth | none | TBD (see §9) |

> **Next.js 16 note:** this version differs from older docs. Read
> `node_modules/next/dist/docs/` before writing framework code. Example: route
> protection uses **`proxy.ts`** (formerly `middleware.ts`) —
> see `01-app/01-getting-started/16-proxy.md`.

---

## 4. How to run

Copy `.env.example` to `src/backend/.env` and add your local secrets there. In PowerShell, use `Copy-Item .env.example src/backend/.env`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npx tsc --noEmit   # type check
npx next build     # production build check
```

**Database:** MongoDB 8 runs locally as a Windows service on `127.0.0.1:27017`
(database `aclc_scheduler`). Check it with `Get-Service MongoDB` in PowerShell.
To browse data, use MongoDB Compass with the same connection string.

If the dev server shows "module factory is not available" after files are moved
or deleted, stop it and run `npm run dev` again (stale Turbopack cache).

---

## 5. Project structure

```text
src/
  app/                           Next.js pages, layouts, and API endpoints
  frontend/                      React components and client state
  backend/                       Auth, MongoDB, models, validation, and services
  shared/                        Shared types, constants, and browser-safe helpers
proxy.ts                         Role-aware redirects for admin and teacher pages
archive/qr-attendance/           Removed attendance code (reference only)
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for the folder map and dependency direction.

---
## 6. Data model

### 6.1 UI types (`src/shared/types/index.ts`)

| Entity | Fields |
| --- | --- |
| Program | id, code (e.g. BSIT), name, track (`college` \| `senior_high`), optional curriculum map |
| Term | id, startYear, semester (`1st Semester` \| `2nd Semester` \| `Summer`) |
| Section | id, termId, name (e.g. BSIT 2-A), program (code), yearLevel (e.g. "2nd Year") |
| Subject | id, code, name, units, track |
| Room | id, name, building, capacity |
| Teacher | id, employeeNumber, firstName, lastName, email, status |
| AdminUser | id, firstName, lastName, email, status |
| ScheduleSlot | id, sectionId, termId, subjectId, teacherId, dayOfWeek, startTime "HH:mm", endTime, modality (`face_to_face` \| `online`), roomId? |
| SectionSubjectAssignment | id, sectionId, subjectId, teacherId |

Teacher and administrator profiles load from MongoDB. Year levels are fixed per
track (`LEVEL_OPTIONS` in the store): College = 1st–4th Year, Senior High = Grade 11–12.

### 6.2 Database (MongoDB, `src/backend/models`) — built

| Model | Fields | Indexes |
| --- | --- | --- |
| Program | code (unique, uppercased), name, track, curriculum entries (course code, year, semester, prerequisite) | code |
| Term | startYear, semester | {startYear, semester} unique |
| Section | termId (ref), name, programId (ref), yearLevel | {termId, name} unique; {termId, programId, yearLevel} |
| Subject | code (unique, uppercased), name, units, track | code |
| Room | name, building, capacity | {name, building} unique |
| Teacher | employeeNumber (unique), firstName, lastName, email, status | employeeNumber |
| Administrator | firstName, lastName, email, status | email |
| AuthAccount | email (unique), role (`admin` \| `teacher`), password hash, auth version, administratorId or teacherId ref, first-admin marker | email; unique profile ref; one bootstrap admin |
| ClassSchedule | termId, sectionId, subjectId, teacherId (refs), dayOfWeek 0–6, startMinutes, endMinutes, mode (`f2f` \| `online`), roomId (ref, nullable), timestamps | {termId, dayOfWeek, roomId}, {termId, dayOfWeek, teacherId}, {termId, dayOfWeek, sectionId} |

### 6.3 Migration differences (decide once, apply everywhere)

| Topic | Now | Target |
| --- | --- | --- |
| Day numbering | `0 = Sunday` (JS `getDay()`) | `0 = Monday … 6 = Sunday` |
| Time | `"08:00"` strings | `startMinutes` / `endMinutes` integers |
| Time range | 07:00–21:00, 30-min steps (done in UI) | 07:00 (420) – 21:00 (1260), 30-min steps |
| Mode names | `face_to_face` / `online` | `f2f` / `online` |
| Section → program | program **code** string | `programId` reference |

The database already uses the target column. The UI still uses the "Now" column
until Phase 4 connects it. Convert in one place (`lib/time.ts`) and never call
`Date.getDay()` directly.

---

## 7. Business rules

### 7.1 Schedule conflicts

Two classes overlap only when they belong to the same term, are on the same day, **and**
`a.start < b.end && b.start < a.end`. Touching (one ends 10:00, next starts 10:00)
is **allowed**.

Checked in this order; the first hit is returned:

1. **Room** — both are face-to-face and share the same room.
2. **Teacher** — same professor (online classes count).
3. **Section** — same section.

When editing, the class being edited is excluded from the check.

### 7.2 Validation

- Face-to-face requires a room. Online has no room.
- End time is after start time; both within 07:00–21:00 on 30-minute steps.
- Codes (program, subject, room, section, employee no.) are unique.
- A section's year level must belong to its program's track.
- A program cannot be deleted while sections use it.
- Deleting a section, subject, or room also deletes the classes that use it
  (with a confirm dialog).

### 7.3 Time zone

All "today" / "now" logic uses **Asia/Manila**.

---

## 8. Known issues and tech debt

| # | Issue | Where | Fixed in |
| --- | --- | --- | --- |
| 1 | All data lost on refresh | `AcademicStore.tsx` | Phase 4 |
| 2 | ~~Professors from mock data~~ — fixed: professors live in the store and reach every form | — | Done |
| 3 | ~~Schedule supports add only — no edit or delete of a class~~ — edit and delete are now available in the calendar and section detail | `schedule/page.tsx`, `sections/[id]/page.tsx` | Done |
| 4 | ~~Conflict check runs only in the browser~~ — schedule API validates room, professor, and section conflicts | `src/backend/services/schedule-service.ts` | Done |
| 5 | Day numbering and `"HH:mm"` strings in the UI differ from the database (§6.3); time range already matches | grid, forms | Phase 4 |
| 6 | ~~No login; Teacher uses a "Viewing as" picker~~ — sign-in and account-linked teacher view are implemented; recovery/rate limiting remain | `src/backend/auth/auth.ts`, `proxy.ts` | Done |
| 7 | Not a git repository — no history or rollback | project root | Phase 0 |
| 8 | Two schedule forms (Schedule page and Section detail) duplicate logic | `schedule/page.tsx`, `sections/[id]/page.tsx` | Phase 5 |

---

## 9. Decisions

| # | Question | Status |
| --- | --- | --- |
| D1 | Database | **Decided** — MongoDB. Local for development; Atlas when deploying |
| D2 | Login method | **Decided** — email + password; admin provisions profiles, teachers verify their registered email and create their own passwords |
| D3 | Day numbering | **Decided** — `0 = Monday … 6 = Sunday` (as in the spec); used by the database |
| D4 | Student sign-in | **Decided** — shared sign-in accepts email or student number. First-time student setup uses the student ID plus an email the student can access; after OTP verification it becomes the account/recovery email. Imported roster email stays separate. Password resets verify the account email by OTP; Super Admin imports `student_id`, `NAME`, and `EMAIL` from Excel. |
| D5 | Hosting | **Open** — Vercel + Atlas (recommended) or school server? Needed by Phase 7 |
| D6 | Academic scope | **Decided** — one active term switcher; a term is an academic year + 1st, 2nd, or optional Summer semester. Programs, subjects, rooms, and professors are shared across terms; sections and classes belong to one term. |

---

## 10. Roadmap and tasks

Work top to bottom. Each task lists its files and a **Done when** check. Do not
start a phase until the previous one passes.

### Done so far

- [x] Scope sections and classes by academic term; keep programs, subjects, rooms, and professors shared.
- [x] Remove students and QR attendance; archive the code.
- [x] Teacher portal (view only) and admin-only scheduler navigation.
- [x] Type check, lint, and production build all clean.
- [x] **Phase 1 — Database foundation** (see below); sample seed records were cleared.
- [x] All sample data removed from the app; professors/admins in the shared store; Users "View info" panel.
- [x] Modern redesign: ACLC navy/red, white sidebar, initials avatars, underline tabs, unified tables and modals, new landing page.
- [x] Schedule runs 07:00–21:00 in 30-minute steps; times shown as AM/PM; end must be after start (`src/shared/lib/time.ts`).
- [x] Choose the active term from Setup when opening Programs; offer optional Summer and section copying when creating a term.
- [x] Keep Programs & sections empty initially; show separate College and Senior High create cards, then show the program list after data is created. Keep the term panel off this page.
- [x] Move section management into Programs, grouped by year level; section pages show a weekly grid with click-to-prefill class scheduling.
- [x] Add Setup page for Terms, Subjects, and Rooms; make MongoDB sections and schedules term-aware.
- [x] Import selectable-text curriculum PDFs from within a College program; review and import each semester separately. Programs show selectable year/grade levels and separate 1st/2nd Semester curriculum views; importing one semester preserves the other.
- [x] Filter schedule subject choices by section program, year/grade level, and active semester when a curriculum map exists.

### Phase 0 — Safety net

- [ ] **0.1 Initialize git.** `git init`, check `.gitignore` covers `node_modules`, `.next`, `.env*`; first commit "Baseline UI".
  Done when: `git log` shows the baseline commit.
- [x] **0.2 Record decisions D1 and D3** in §9.

### Phase 1 — Database foundation

- [x] **1.1 Install** `mongoose`, `zod`, `tsx` (Vitest moves to 2.3).
- [x] **1.2 `lib/db.ts`** — cached Mongoose connection (safe across hot reload and serverless). Throw a clear error if `MONGODB_URI` is missing.
- [x] **1.3 `.env.example`** with safe defaults/placeholders; real values in gitignored `src/backend/.env` (loaded by `next.config.ts`, never committed).
- [x] **1.4 Models** in `src/backend/models` per §6.2, including AuthAccount.
- [x] **1.5 Sample data cleanup:** removed the demo records from the local database and removed the sample-seed command. Create real records from Setup and the app pages.

### Phase 2 — Core logic + tests

- [ ] **2.1 `lib/time.ts`** — done: `toMinutes`, `toHHMM`, `formatTime` ("10:00 AM"), `TIME_OPTIONS`. Still to add: day labels for `0 = Monday`, `manilaNow()`.
- [ ] **2.2 `lib/schedule-conflict.ts`** — `scheduleInputSchema` (Zod, §7.2) and `findConflict(input, existing, excludeId?)` (§7.1).
- [ ] **2.3 Install Vitest; tests** — room clash, teacher clash (incl. online), section clash, back-to-back allowed, online never clashes on room, editing does not clash with itself, Sunday (= 6) saves.
  Done when: `npm test` is green.

### Phase 3 — API routes (`/app/api/admin`)

- [x] Program CRUD and curriculum persistence (GET list, POST, PATCH, DELETE) through Setup API routes.
- [ ] **3.1 Remaining CRUD** for sections, subjects, rooms, teachers (GET list, POST, PATCH `[id]`, DELETE `[id]`). Zod-validate; 400 with field errors; 409 on duplicate code; 409 when deleting a program still used by sections.
- [ ] **3.2 Schedules** — Basic GET/POST/PATCH/DELETE and server-side conflict checks are connected. Still add GET filters (`roomId`, `teacherId`, `sectionId`, `dayOfWeek`), populated names, and structured 409 `{ type, message, conflictingEntry }` responses with a readable message, e.g. *"Comlab 1 is already used by BSIT 2B for CC 104 on Monday, 10:00 AM – 12:00 PM."*
- [ ] **3.3 `GET /api/admin/lookups`** — all programs, rooms, sections, subjects, teachers for dropdowns.
- [x] **3.4** Admin API handlers verify the signed-in administrator role.
  Done when: every route works via curl/Thunder Client, including 400 and 409 cases.

### Phase 4 — Connect the UI to the API

- [ ] **4.1** Replace remaining in-memory state in `AcademicStore.tsx` with API calls, **keeping the same function names** so pages barely change. Load on mount; show loading and error states.
- [x] **4.2** Users page reads/writes professors and administrator profiles through the API.
- [ ] **4.3** Schedule form, section detail, teacher portal, and grid read professors from the API. Schedule slots now load/save through the schedule API.
  Done when: create data, refresh the browser, data is still there.

### Phase 5 — Schedule tool upgrade

- [ ] **5.1** Grid 07:00–21:00 with 30-minute lines — **done**. Still to do: `0 = Monday` columns once Phase 4 connects the database.
- [ ] **5.2** Views: By room, By professor, By section, All rooms (one column per room for a chosen day). Room views show face-to-face only.
- [ ] **5.3** One shared `ScheduleForm` used by the Schedule page and Section detail (fixes §8 #8).
- [ ] **5.4** Click an empty slot → form prefilled (day, 1-hour time, room). Clicking a block opens edit; deletion is available from the edit form. Still add two-step Delete.
- [ ] **5.5** Show the API's 409 message inside the form; keep it open.
- [ ] **5.6** Highlight today and draw a "now" line (Asia/Manila), refresh each minute.
- [ ] **5.7** Face-to-face blocks: tinted fill + thick left border. Online: dashed border.
  Done when: all checks in §11 pass by hand.

### Phase 6 — Login and roles

- [x] **6.1** Email/password login, scrypt password hashes, signed httpOnly session cookie, logout, and one-time first-admin setup. Read the Next.js 16 authentication guide first.
- [x] **6.2** `proxy.ts` guards admin and teacher pages; every admin API handler re-checks the administrator role.
- [x] **6.3** Teacher portal uses the signed-in teacher profile; removed the "Viewing as" picker.
- [x] **6.4** Admin creates teacher profiles from Users; teachers create their own passwords after verifying their registered email. Administrators continue to provision administrator passwords.
  Done when: signed-out users are redirected to login; a teacher cannot open admin pages or admin APIs.

### Phase 7 — Ship

- [ ] **7.1** Review for leftover mock data and unused UI.
- [ ] **7.2** `npm run lint`, `npx tsc --noEmit`, `npm test`, `npx next build` all clean.
- [ ] **7.3** Deploy per D5; set `MONGODB_URI` and auth secrets in the host.
- [ ] **7.4** Update README with setup and deploy steps.
  Done when: production URL works with real data and login.

### Phase 8 — Student QR attendance

- [x] **8.1** Add real student identities and term-specific section enrollment; Super Admin imports `.xlsx` rosters inside a section using `student_id`, `NAME`, and `EMAIL`. Same-term enrollment in another section is blocked; existing roster entries can be updated on re-import.
- [x] **8.2** Add student role, email/student-number sign-in and OTP setup, protected student portal, own-section schedule, live attendance notices, QR scanning, and personal attendance history.
- [x] **8.3** Let teachers open and close attendance for their assigned scheduled class. Handled-section detail lists only that teacher's subjects.
- [x] **8.4** Students display their personal signed QR, rotated every 10 seconds. Teachers scan it in the Flutter app; the server checks token expiry, class ownership, student enrollment, and duplicate check-ins. Students see active attendance and their own check-in history. Records are marked present; late cutoffs are not configured yet.
- [ ] **8.5** Add a teacher fallback for manual attendance corrections with an audit trail, plus admin/teacher attendance reports and export.
  Done when: a student can scan only an active class QR, cannot check in twice or for another section, and can view only their own attendance history.

---

## 11. Acceptance checklist (run after Phase 5 and before every release)

1. A room already used at an overlapping time is blocked with a clear message.
2. A professor cannot have two overlapping classes, even if one is online.
3. A section cannot have two overlapping classes.
4. Back-to-back classes (10:00 end → 10:00 start) are allowed.
5. Editing a class without changing its time does not conflict with itself.
6. Sunday classes (dayOfWeek 6) display and save correctly.
7. Online classes never appear in room views.
8. Data survives a page refresh.
9. A teacher sees only their own classes and cannot open admin pages.

---

## 12. Conventions

- **Server validation is the source of truth.** The UI may pre-check, but the API decides.
- Reusable server logic in `src/backend`, shared browser-safe helpers and types in `src/shared`, route handlers in `src/app/api`.
- Shared types in `src/shared/types`; one Zod schema per input, infer types from it.
- UI building blocks live in `src/frontend/components/ui`; `Button` variants: `primary`, `secondary`, `ghost`, `danger`, `danger-ghost`.
- `cn()` uses `tailwind-merge`: a class passed by a page (e.g. `h-8 px-3`) overrides the component default.
- **Design system (ACLC, clean & light):** colors are tokens in `src/app/globals.css` — `accent` = ACLC navy, `brand` = ACLC red (used sparingly: logo, active-nav bar), neutrals for everything else. Fonts: Plus Jakarta Sans (headings), Inter (body). Use `PageHeader`, `Tabs`, `TableCard` + `th`/`td`, `Panel`, `StatCard`, `Badge` (`dot` for statuses), `Avatar` (initials — no cartoon avatars). Row actions are icon buttons with a `title`.
- Never put a CSS `transform` on a page wrapper: it traps `position: fixed` modals and toasts.
- Lists are tables with Edit / Delete per row; destructive actions confirm first.
- Scope every section and class to a term; avoid hard-coding a current term in data or conflict checks.
- Commit after every finished task; message names the task id (e.g. `2.2 add schedule conflict check`).
