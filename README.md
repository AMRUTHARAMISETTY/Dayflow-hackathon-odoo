# Dayflow HR Portal

Dayflow is a post-login HR/Admin portal for the tagline "Every workday, perfectly aligned." This repository was empty at implementation time, so the project is organized as a greenfield monorepo:

- `backend`: Spring Boot 3, Java 21, Spring Security, JDBC, Flyway, H2 dev database, Swagger UI.
- `frontend`: React 19, TypeScript, Vite, Recharts, Lucide icons, responsive CSS.

## Demo Login

- Email: `admin@dayflow.test`
- Password: `Dayflow@123`

Public registration is limited to the `Employee` role. HR and admin permissions are seeded server-side and enforced by backend permission checks.

## Run Locally

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

Open `http://localhost:5173`. Swagger is available at `http://localhost:8080/swagger-ui.html`.

## Tests

Backend:

```powershell
cd backend
mvn test
```

Frontend:

```powershell
cd frontend
npm.cmd test
```

## Implemented Scope

- Secure login with bcrypt password verification and role/permission payload.
- Public employee-only registration guard.
- Role-aware HR app shell with desktop sidebar, mobile drawer, sticky header, search, quick create, notifications, theme switcher, and offline indicator.
- API-backed HR dashboard with live KPI aggregates, action queue, recent activity, cached last-successful response, loading and error states.
- Employee directory with search, department filters, table/grid views, add employee, export action, and invitation action.
- Leave approval queue with approval/rejection validation and audit logging.
- Payroll anomaly review from database-backed anomaly records using decimal money fields.
- HR email center with provider-ready local queue, idempotency key audit, bulk confirmation guard, schedule/send flows.
- HR ticket queue with confidential-ticket filtering support.
- Automation rule list with high-risk confirmation before toggling.
- Immutable audit log endpoint and audit screen.
- Flyway migration for roles, permissions, employees, attendance, leave, payroll, email, tickets, automation, notifications, and audit logs.

## Environment Variables

- `DAYFLOW_CORS_ORIGIN`: allowed frontend origin, default `http://localhost:5173`.
- `SPRING_DATASOURCE_URL`: JDBC URL, default H2 file database.
- `VITE_API_BASE`: optional frontend API base; leave empty when using the Vite proxy.

## Integration Notes

Email delivery currently uses a local development adapter that records messages in `email_messages`. Gmail, Microsoft Graph, or transactional providers can be added behind the same `/api/hr/email/send` contract without committing credentials.

## Current Limitations

This is a functional local implementation, not the full enterprise suite described in the long blueprint. Remaining phases include PostgreSQL production profile, refresh tokens, file storage and validation, PDF generation, WebSocket/SSE notifications, advanced workflow execution, self-service AI with policy citations, payroll calculation engine, Playwright coverage, and deeper authorization scopes for manager reporting chains.
