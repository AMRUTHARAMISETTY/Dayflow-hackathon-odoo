# Dayflow authentication setup

## Local prerequisites

Java 21, Maven 3.9+, Node 20+, npm, and PostgreSQL 15+ are required. Copy `.env.example` to your environment and replace every placeholder. `JWT_SECRET` must contain at least 32 random bytes.

1. Start PostgreSQL with `docker compose up -d postgres`, or create a local `dayflow` database/user manually.
2. Export backend variables from `.env.example`.
3. Run `mvn -f backend/pom.xml spring-boot:run`.
4. Run `npm install && npm run dev`.
5. Open `http://localhost:5173/sign-in`. OpenAPI is at `http://localhost:8080/docs`.

Flyway creates the authentication tables and fixed roles. A bootstrap Admin is created only when no Admin exists and both bootstrap variables are set. Remove those variables immediately afterward. Employees must be provisioned as pending records by an authorized HR process before activation.

## Production

Set `COOKIE_SECURE=true`, HTTPS origins, the registrable WebAuthn RP ID, strict SMTP TLS, and a unique secret from a secret manager. Frontend and API should share a parent site for strict cookies. Configure the reverse proxy to overwrite—not append—forwarded headers. Database and email outages fail authentication closed.

## API

Swagger documents request/response schemas at `/v3/api-docs`. Core routes are under `/api/auth`; Admin routes under `/api/admin` require a server-issued `ADMIN_HR` authority. Access tokens go in `Authorization: Bearer`; refresh tokens are never exposed to JavaScript.

## Tests

- Frontend: `npm run build`, `npm run lint`, `npm run test:e2e`
- Backend: `mvn -f backend/pom.xml test`
- The PostgreSQL migration test uses Testcontainers and skips only when Docker is unavailable.
