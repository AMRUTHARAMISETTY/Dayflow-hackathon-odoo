# Dayflow HR Portal — Phase 6: Intelligence

Dayflow is a post-login HR/Admin portal ("Every workday, perfectly aligned.") built from the
full product blueprint. The blueprint describes a multi-year enterprise HR suite; this repo
implements it phase by phase, following the blueprint's own priority order (spec section 23):

1. Foundation — auth, permissions, employee directory, responsive shell, audit.
2. Core HR — attendance, leave, approvals, notifications.
3. Automation — Action Center, reminders, workflow and rule builder.
4. Payroll — payroll, anomalies, salary slips. (Document generation, the other half of the
   blueprint's "Payroll & docs" phase, is not built yet — see Known simplifications.)
5. Communication — built-in email, templates, HR help desk, company policies, and a rule-based
   self-service assistant.
6. **Intelligence** (this phase) — goals, performance reviews, and rule-based workforce insights
   (headcount trend, attrition risk signals).
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

The suite exercises the security properties spec sections 2, 7, 8, 9, 17 and 21 call out: public
registration can't self-elevate, row-level employee/attendance/leave/payroll visibility follows
role scope, sensitive job changes require a reason, refresh tokens are single-use, an HR Admin
can't invite a Super Admin or peer HR Admin account, a single low-risk day of leave auto-approves
while a multi-day request routes to the manager, an approved attendance correction actually
mutates the underlying record, an automation dry-run never notifies anyone or mutates state,
payroll maker-checker actually blocks the calculator from approving their own run, a confidential
HR ticket is invisible to (and can't be assigned to) staff without `ticket:confidential:read`,
internal ticket notes stay hidden from the reporting employee, and the self-service assistant's
escalate path really does create an HR ticket.

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

**Phase 4 — Payroll**

- Versioned, effective-dated salary structures (basic/HRA/allowances/recurring deductions);
  revising one supersedes the previous version rather than editing it in place, so compensation
  history stays intact. Owned by HR Admin, not Payroll Officer — spec section 2's "payroll
  permissions must be separated from general HR permissions" is enforced by giving `salary:write`
  and `payroll:manage` to different roles.
- The full Draft → Calculated → Under Review → Approved → Published → Paid cycle
  (**Finance → Payroll**), with genuine maker-checker: the run's `calculated_by` user id is
  checked against the approver's, so the same person can never both calculate and approve.
- An anomaly engine that runs on every calculation: missing salary structure, unverified
  bank/tax details, negative net pay (all **blocking** — publish is refused until each is
  reviewed), plus unusual overtime, unexpected salary change since the last revision, and a
  cross-check against pending attendance corrections (all non-blocking, surfaced for review).
- Pay is computed from real Phase 2 data, not placeholders: unpaid-leave days come from the same
  day-resolution logic the Attendance module uses (a day with no check-in, no approved leave, and
  no holiday/weekend is unpaid), and overtime pay comes from summed `attendance_records.overtime_minutes`.
- Salary slips are read-only and only ever visible once a run reaches Published/Paid — an
  employee sees only their own, via the same self/broad scoping pattern as attendance and leave.
  Publishing notifies every affected employee.
- Employee 360 gained a **Payroll** tab: current structure, bank/tax verification toggles,
  structure history, and published slips, gated by `salary:read` / `payroll:read` / `payroll:read:own`.

**Phase 5 — Communication**

- **Built-in email** (**Communication → Email**, `email:read`/`email:send`/`email:templates:manage`):
  compose to an explicit employee list, a department, or all active employees, with `{{merge_field}}`
  templating (`employee_name`, `employee_id`, `department`, `designation`, `manager_name`,
  `joining_date`, `organization_name`) rendered per recipient. Nine seeded lifecycle/leave/
  attendance/payroll/engagement templates, HR-authorable custom templates, a mandatory recipient
  preview (count + sample render) before sending, and a bulk-send guard: anything over 10
  recipients is refused unless the request explicitly confirms it just saw that preview (spec
  10.1). Sends go through an `EmailProvider` abstraction — `LocalDevEmailProvider` logs what
  would have gone out instead of calling a real SMTP/Graph/Gmail API, since no such credential is
  configured in this environment — so message/delivery status, idempotency-keyed retries, and a
  self-test-send are all real, just not actually leaving the building.
- **HR Help Desk** (**Communication → Help Desk**, `ticket:read`/`ticket:read:own`/`ticket:manage`/
  `ticket:confidential:read`): employees raise tickets against a category; priority and a
  by-priority SLA due date (Critical 4h → Low 120h) are suggested from keyword matching on the
  subject/description (harassment/safety/legal/etc. → High), not a model call. Confidential
  tickets (grievances) are structurally restricted — only the reporting employee, `ticket:
  confidential:read` holders (Super Admin, HR Admin), and whoever the ticket is assigned to can
  ever see one; assigning a confidential ticket to someone without that permission is refused
  outright, so an HR Officer can be trusted with general tickets without ever being handed a
  grievance. HR-only internal notes on a ticket thread stay invisible to the reporting employee.
  Employees rate a resolved/closed ticket 1-5.
- **Company policies** (**Communication → Policies**, `policy:read`/`policy:manage`): a simple
  versioned policy library (four seeded: Leave, Remote & Hybrid Work, Attendance & Punctuality,
  Code of Conduct) readable by every role, editable/archivable only by HR.
- **Self-service assistant** (**Communication → Assistant**, `assistant:use`): answers leave-
  balance, salary-slip, attendance, and policy questions by routing on keyword intent over the
  same live data the rest of the portal reads — there's no LLM credential configured here, so it
  never generates free text, only assembles it from real records. Every question, detected
  intent, and answer is logged to `assistant_interactions` so HR can see what people are actually
  asking. Anything it can't answer offers a one-click escalation straight into an HR ticket
  (logged as its own `ESCALATION` interaction referencing the created ticket).

**Phase 6 — Intelligence**

- **Goals & performance reviews** (**Employee Experience → Performance**,
  `performance:read:own`/`performance:read`/`performance:manage`/`performance:manage:reports`):
  HR can set/manage goals and reviews for anyone; a Manager is scoped server-side to their direct
  reports only (`employee.managerId == actor`) — the same reports-scoping pattern used for
  attendance and leave. Every employee sees and progresses their own goals and acknowledges their
  own submitted reviews. A review is maker-checker-adjacent: only the assigned reviewer (or HR)
  can submit it, and only the reviewed employee can acknowledge it.
- **Workforce insights** (**Insights → Workforce Insights**, `insights:read`, HR/Auditor only):
  a headcount trend (active roster by join month, real data) with a simple 2-month linear
  projection from the last 3 months' net change, and rule-based attrition-risk flags (no approved
  leave in 90 days despite 6+ months' tenure, 5+ late arrivals in 30 days, no manager assigned, or
  a very new hire) computed from real attendance/leave/tenure records. Both are explicitly
  transparent, auditable rules — not a forecasting or ML model, since no such credential is
  configured in this environment (same honesty principle as the Phase 5 assistant).

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
- Invitation links are still shown directly in the UI rather than emailed — the Phase 5 email
  module isn't wired into the invitation flow yet, only into HR-initiated composition/templates.
- No real SMTP/Graph/Gmail credential is configured; `EmailProvider` is an abstraction with a
  `LocalDevEmailProvider` that logs what would be sent. Swapping in a real provider is a matter of
  adding a new `EmailProvider` implementation, not changing any calling code.
- The self-service assistant is rule-based keyword routing over real data, not a generative model
  — there's no LLM credential configured in this environment. It only ever answers from the four
  intents it recognizes (leave balance, salary slip, attendance, policy) and otherwise offers to
  raise a ticket.
- Single-organization only; the "organization scope" mentioned for HR Admin in spec section 2
  is represented by employee `location`, not multi-tenancy.
- No file uploads, document generation, or PDF export yet — salary slips and job letters are
  structured data rendered in the UI, not downloadable PDFs. This is the other half of the
  blueprint's "Payroll & docs" phase, not yet built.
- Attendance corrections are self-service only (an employee requests, a manager/HR decides); HR
  filing a correction on someone else's behalf isn't built yet.
- No shift-management UI yet — shifts exist and are assignable via the API/seed data, but there's
  no admin screen to create or reassign them (nav item is marked accordingly).
- "Manager delegation during absence" (spec section 8) isn't built — while a manager is out,
  their approval queue still waits on them or falls back to HR, not a delegate.
- Tax is a flat 10% placeholder, not a real jurisdiction-specific slab-based statutory engine —
  building one correctly is out of scope here and would need real tax/compliance input.
- "Duplicate allowance" and "inactive employee included in payroll" (spec section 9.1) aren't
  separately flagged: the salary structure model uses single allowance/deduction totals rather
  than itemized line items, and the payroll population is computed as active-employees-at-run-time,
  so an inactive employee can't be included by construction.
- Demo attendance history only covers the last few days, so a month-to-date payroll calculation
  will show large unpaid-leave deductions for seeded accounts — the calculation is real and
  correct given the data; the seed data just doesn't populate a full month.
