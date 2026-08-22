# Dayflow HR Portal — Phase 3: Automation

Dayflow is a post-login HR/Admin portal ("Every workday, perfectly aligned.") built from the
full product blueprint. The blueprint describes a multi-year enterprise HR suite; this repo
implements it phase by phase, following the blueprint's own priority order (spec section 23):

1. Foundation — auth, permissions, employee directory, responsive shell, audit.
2. Core HR — attendance, leave, approvals, notifications.
3. **Automation** (this phase) — Action Center, reminders, workflow and rule builder.
4. Payroll & docs — payroll, anomalies, salary slips, document generator.
5. Communication — built-in email, templates, announcements, HR help desk.
6. Intelligence — self-service assistant, forecasting, performance summaries.
7. Scale — integrations, scheduled reports, offline resilience, hardening.

Nothing from later phases is faked. Where the dashboard or navigation references a module that
doesn't exist yet, it says so explicitly (an unavailable KPI card, a disabled nav item labelled
with its phase) rather than showing placeholder numbers.

Alongside the numbered phases, **Team Management** (spec section 41 — a separate feature area,
not one of the 7 numbered phases) is also implemented: teams, projects, milestones, tasks with
assignees, and a workload/capacity view. See `frontend/src/pages/{Teams,Projects,Tasks,Workload}Page.tsx`
and the backend `team`/`project`/`task`/`workload` packages.

- `backend`: Spring Boot 3, Java 21, Spring Security, JDBC, Flyway, PostgreSQL, Swagger UI.
- `frontend`: React 19, TypeScript, Vite, React Router, responsive CSS.

## Demo logins

Every account uses the password `Dayflow@123`.

| Email | Role |
| --- | --- |
| `admin@dayflow.test` | Super Admin |
| `hradmin@dayflow.test` | HR Admin |
| `hrofficer@dayflow.test` | HR Officer |
| `payroll@dayflow.test` | Payroll Officer |
| `manager@dayflow.test` | Manager (Rohan Mehta) |
| `employee@dayflow.test` | Employee (Dev Iyer, reports to Rohan) |
| `auditor@dayflow.test` | Auditor |

One additional employee (Ananya Gupta) is seeded mid-onboarding with no login yet, so you can
demo the "send invitation" flow from her profile. Demo attendance history includes a late
arrival, an overtime day, and a checked-in-but-never-checked-out day (for Rohan Mehta) so the
missing-checkout detector has something to find. Dev Iyer has a pending multi-day leave request
waiting on Rohan's approval; Nisha Rao has an already-approved, auto-approved sick day.

Public registration at `/register` always creates a plain **Employee** account — there is no
role field on that form or its API request, so nobody can grant themselves elevated access that
way. HR/Admin/Manager/Payroll/Auditor accounts can only be created by a Super Admin (or, for the
roles below it, an HR Admin) issuing a time-boxed invitation from **Administration → Invitations**.

## Run locally (Docker Compose — recommended)

```powershell
docker compose up
```

This starts PostgreSQL, the Spring Boot API (`:8080`) and the Vite dev server (`:5173`) with demo
data seeded automatically. Open `http://localhost:5173`.

## Run locally (without Docker)

You need a local PostgreSQL instance with a `dayflow` database and a `dayflow` user/password (or
override the connection via the environment variables below).

Backend:

```powershell
cd backend
mvn spring-boot:run
```

Frontend:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173`. Swagger UI is at `http://localhost:8080/swagger-ui.html`.

**Timezone note:** attendance lateness/overtime is computed by comparing the server JVM's local
wall-clock time against each shift's start/end time, so the JVM's timezone should match your
organization's local timezone (a reasonable assumption for the single-organization scope of this
build). If your PostgreSQL JDBC connection fails with `invalid value for parameter "TimeZone"`,
your JVM is reporting a deprecated zoneinfo alias (e.g. `Asia/Calcutta` instead of
`Asia/Kolkata`) that your Postgres server's zoneinfo database no longer recognizes — pass
`-Duser.timezone=<modern IANA zone id>` when running `mvn spring-boot:run`.

## Tests

Backend (Spring context + MockMvc, against an in-memory H2 database):

```powershell
cd backend
mvn test
```

The suite exercises the security properties spec sections 2, 7, 8 and 21 call out: public
registration can't self-elevate, row-level employee/attendance/leave visibility follows role
scope, sensitive job changes require a reason, refresh tokens are single-use, an HR Admin can't
invite a Super Admin or peer HR Admin account, a single low-risk day of leave auto-approves while
a multi-day request routes to the manager, and an approved attendance correction actually mutates
the underlying record.

Frontend:

```powershell
cd frontend
npm.cmd test
```

## What's implemented

**Phase 1 — Foundation**

- JWT access tokens (15 min) + rotating, single-use opaque refresh tokens (7 days), bcrypt
  password hashing, stateless sessions.
- Public registration hard-coded to the Employee role; every other role requires a Super
  Admin/HR Admin-issued, expiring, single-use invitation (`/api/invitations`).
- Role → permission model for Super Admin, HR Admin, HR Officer, Payroll Officer, Manager,
  Employee and Auditor, enforced server-side on every endpoint — including row-level scoping
  (a Manager only sees direct reports, an Employee only sees themself).
- Employee directory: server-side search, filtering, sorting, pagination, table and grid views,
  responsive card layout on mobile.
- Employee 360 profile: header, Overview/Personal/Employment/History/Attendance/Leave tabs; the
  Payroll/Documents/Performance/Skills/Communication/Assets tabs are visible but explicitly
  marked with the phase that builds them.
- Sensitive employee changes (department, manager, designation, location, employment type,
  suspend/reactivate/archive) require a reason and are captured in an immutable
  `employee_job_history` table in addition to the general audit log.
- Organization chart, immutable audit log with a filterable admin screen.

**Phase 2 — Core HR**

- Shift templates (start/end/grace/break) assignable per employee.
- Day-based check-in/check-out with server timestamps, automatic lateness/overtime/early-
  departure calculation, and a resolved day-status view (Present/Absent/On Leave/Holiday/
  Weekend/Not Checked In) that's synthesized from real records rather than requiring a stored
  row for every employee on every day.
- A scheduled job flags checked-in-but-never-checked-out days and notifies the employee.
- Attendance-correction workflow: employee requests with evidence, routed to their manager (HR
  as fallback), approve/reject actually mutates the underlying attendance record.
- Configurable leave types, per-employee balances, holiday calendar, and working-day-aware leave
  requests (weekends/holidays excluded from the day count).
- "Smart Approval": a single working day of leave with sufficient balance auto-approves;
  everything else routes to the employee's manager, falling back to HR if no manager is
  assigned or the manager lacks approval rights. Approval/cancellation immediately syncs
  attendance (marks days On Leave / reverts them) and adjusts the balance.
- In-app notifications with a live unread-count badge and dropdown, pushed over Server-Sent
  Events with REST fallback (list, mark read/all-read).
- HR home dashboard KPIs (present today, absent/on leave, late arrivals, pending approvals) are
  now real, permission-scoped numbers instead of "not yet available" placeholders, plus a 7-day
  team-availability widget.

**Phase 3 — Automation**

- A small, safe rule engine (`automation_rules` / `automation_executions`): HR toggles
  active/test-mode and edits thresholds on existing, code-defined handlers rather than authoring
  arbitrary logic — "no-code" without an arbitrary-code-execution surface. Deliberately scoped to
  reminders/escalations/notifications only; core transactional side effects (leave balance
  deduction, attendance sync on approval) stay hardcoded in their own services so a rule being
  disabled or misconfigured can never silently break business state.
- Two built-in automations: `ATTENDANCE_MISSING_CHECKOUT` (the Phase 2 missing-checkout job,
  migrated onto the engine so it has visible run history) and `LEAVE_PENDING_REMINDER` (reminds
  the routed approver after a configurable number of hours, then escalates to HR if still
  unresolved) — each idempotent, each with dry-run mode that reports what would happen without
  notifying anyone or touching state.
- Automation management screen (**Administration → Workflow Builder**): per-rule active/test-mode
  toggles, threshold config, run-now/dry-run, and execution history (status, matched/actioned
  counts, detail).
- Action Center (**Work Management → Approvals**): every pending leave approval, attendance
  correction, and onboarding follow-up in one screen with real inline Approve/Reject actions,
  built on the same permission-scoped list the dashboard's "Needs your attention" widget uses.

## Environment variables

- `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` — PostgreSQL connection, defaults match
  `docker-compose.yml`.
- `DAYFLOW_CORS_ORIGIN` — allowed frontend origin, default `http://localhost:5173`.
- `DAYFLOW_JWT_SECRET` — HMAC signing key for access tokens. **Change this in any real
  deployment** — the default is a development-only placeholder.
- `DAYFLOW_ACCESS_TOKEN_MINUTES`, `DAYFLOW_REFRESH_TOKEN_DAYS`, `DAYFLOW_INVITATION_HOURS` —
  session/invitation lifetimes.
- `DAYFLOW_SEED_DEMO_DATA` — set to `false` to skip demo data seeding.
- `VITE_API_BASE` — optional frontend API base; leave empty to use the Vite dev proxy.

## Known simplifications

- Invitation and refresh tokens are returned to the client in the JSON body rather than an
  httpOnly cookie; a production deployment should move them behind a same-site cookie.
- Invitation links are shown directly in the UI instead of emailed — real email delivery is
  Phase 5 (Built-in Email and Communication Center).
- Single-organization only; the "organization scope" mentioned for HR Admin in spec section 2
  is represented by employee `location`, not multi-tenancy.
- No file uploads, document generation, or PDF export yet (Phase 4).
- Attendance corrections are self-service only (an employee requests, a manager/HR decides); HR
  filing a correction on someone else's behalf isn't built yet.
- No shift-management UI yet — shifts exist and are assignable via the API/seed data, but there's
  no admin screen to create or reassign them (nav item is marked accordingly).
- "Manager delegation during absence" (spec section 8) isn't built — while a manager is out,
  their approval queue still waits on them or falls back to HR, not a delegate.
- No unified cross-module "My Tasks"/Action Center inbox yet — leave approvals and attendance
  corrections each have their own queue; a single combined inbox is Phase 3.
