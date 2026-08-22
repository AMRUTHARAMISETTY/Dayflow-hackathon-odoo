# Dayflow authentication threat model

## Trust boundaries

The browser is untrusted. Roles, account state, permissions, Employee ID ownership, invitation validity, and record ownership are decided by PostgreSQL-backed server code. SMTP and WebAuthn authenticators are external trust boundaries. Reverse proxies must terminate TLS and overwrite forwarded headers.

## Primary threats and controls

- Credential stuffing: generic messages, BCrypt cost 12, progressive delays, persistent attempt records, temporary lockout, and Admin MFA.
- Token theft: ten-minute access tokens; opaque refresh tokens hashed at rest, rotated on use, HttpOnly/Secure/SameSite cookies, and reuse detection that revokes the token family.
- Account enumeration: login, activation, OTP send, and recovery return equivalent public responses.
- Privilege escalation: only `ADMIN_HR` and `EMPLOYEE` exist; activation cannot set a role; Admin creation requires an authorized backend principal or one-time environment bootstrap.
- CSRF and cross-origin abuse: strict CORS, SameSite cookies, CSRF tokens on authenticated state changes, and bearer access tokens.
- Passkey compromise: Spring Security validates origin, RP ID, challenge, counter, and signatures. Dayflow stores public-key credential data only—never fingerprints, face imagery, or biometric templates.
- Session replay: refresh rotation, hashed tokens, expiry, session revocation, and device/security-event visibility.
- Database injection: parameterized `JdbcClient` statements and constrained schema values.
- Audit tampering: security and administrative changes are append-only application events. Production should export these tables to immutable centralized storage.

## Deployment requirements

Use HTTPS, a managed PostgreSQL service with encrypted storage and backups, a secret manager, an authenticated SMTP provider, restrictive network rules, CSP at the frontend edge, centralized redacted logs, and key rotation. Remove bootstrap credentials after first use. Run penetration testing before processing real employee or payroll data.
