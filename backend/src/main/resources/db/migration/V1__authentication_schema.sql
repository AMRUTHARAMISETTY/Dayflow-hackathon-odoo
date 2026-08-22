CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (id SMALLSERIAL PRIMARY KEY, code VARCHAR(32) UNIQUE NOT NULL CHECK (code IN ('ADMIN_HR','EMPLOYEE')));
CREATE TABLE permissions (id SMALLSERIAL PRIMARY KEY, code VARCHAR(80) UNIQUE NOT NULL);
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), employee_id VARCHAR(40) UNIQUE, email VARCHAR(320) UNIQUE NOT NULL,
  display_name VARCHAR(160) NOT NULL, password_hash VARCHAR(255), status VARCHAR(24) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','ACTIVE','SUSPENDED','TERMINATED','LOCKED','DEACTIVATED')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE, activated_at TIMESTAMPTZ, failed_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ, password_changed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE user_roles (user_id UUID REFERENCES users(id) ON DELETE CASCADE, role_id SMALLINT REFERENCES roles(id), PRIMARY KEY(user_id,role_id));
CREATE TABLE role_permissions (role_id SMALLINT REFERENCES roles(id) ON DELETE CASCADE, permission_id SMALLINT REFERENCES permissions(id) ON DELETE CASCADE, PRIMARY KEY(role_id,permission_id));
CREATE TABLE employee_profiles (user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, department VARCHAR(120), manager_user_id UUID REFERENCES users(id), joining_date DATE, employment_status VARCHAR(24) NOT NULL DEFAULT 'ACTIVE');
CREATE TABLE hr_invitations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), email VARCHAR(320) NOT NULL, name VARCHAR(160) NOT NULL, permissions JSONB NOT NULL DEFAULT '[]', token_hash VARCHAR(64) UNIQUE NOT NULL, invited_by UUID NOT NULL REFERENCES users(id), expires_at TIMESTAMPTZ NOT NULL, accepted_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE webauthn_credentials (credential_id BYTEA PRIMARY KEY, user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, public_key BYTEA NOT NULL, signature_count BIGINT NOT NULL DEFAULT 0, transports VARCHAR(255), device_name VARCHAR(120) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_used_at TIMESTAMPTZ);
CREATE TABLE refresh_sessions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash VARCHAR(64) UNIQUE NOT NULL, device_name VARCHAR(160), user_agent_hash VARCHAR(64), ip_prefix VARCHAR(80), created_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_used_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, replaced_by UUID REFERENCES refresh_sessions(id));
CREATE TABLE trusted_devices (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, device_hash VARCHAR(64) NOT NULL, name VARCHAR(120), trusted_until TIMESTAMPTZ NOT NULL, revoked_at TIMESTAMPTZ, UNIQUE(user_id,device_hash));
CREATE TABLE login_attempts (id BIGSERIAL PRIMARY KEY, identifier_hash VARCHAR(64) NOT NULL, user_id UUID REFERENCES users(id) ON DELETE SET NULL, successful BOOLEAN NOT NULL, ip_hash VARCHAR(64), attempted_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE INDEX login_attempt_identifier_time ON login_attempts(identifier_hash, attempted_at DESC);
CREATE TABLE email_verification_tokens (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose VARCHAR(40) NOT NULL, token_hash VARCHAR(64) UNIQUE NOT NULL, attempts SMALLINT NOT NULL DEFAULT 0, expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE password_reset_tokens (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash VARCHAR(64) UNIQUE NOT NULL, expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE recovery_codes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, code_hash VARCHAR(255) NOT NULL, used_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE security_events (id BIGSERIAL PRIMARY KEY, user_id UUID REFERENCES users(id) ON DELETE SET NULL, event_type VARCHAR(80) NOT NULL, severity VARCHAR(16) NOT NULL, ip_hash VARCHAR(64), user_agent VARCHAR(255), metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE audit_logs (id BIGSERIAL PRIMARY KEY, actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL, target_user_id UUID REFERENCES users(id) ON DELETE SET NULL, action VARCHAR(100) NOT NULL, metadata JSONB NOT NULL DEFAULT '{}', created_at TIMESTAMPTZ NOT NULL DEFAULT now());

INSERT INTO roles(code) VALUES ('ADMIN_HR'),('EMPLOYEE');
INSERT INTO permissions(code) VALUES ('EMPLOYEE_MANAGE'),('TEAM_MANAGE'),('ATTENDANCE_ORG_READ'),('LEAVE_APPROVE'),('PAYROLL_MANAGE'),('DOCUMENT_MANAGE'),('REPORT_READ'),('AUTOMATION_MANAGE'),('ACCOUNT_MANAGE'),('AUDIT_READ'),('SELF_PROFILE'),('SELF_ATTENDANCE'),('SELF_LEAVE'),('SELF_PAYSLIP'),('SELF_DOCUMENT');
INSERT INTO role_permissions SELECT r.id,p.id FROM roles r CROSS JOIN permissions p WHERE r.code='ADMIN_HR';
INSERT INTO role_permissions SELECT r.id,p.id FROM roles r JOIN permissions p ON p.code IN ('SELF_PROFILE','SELF_ATTENDANCE','SELF_LEAVE','SELF_PAYSLIP','SELF_DOCUMENT') WHERE r.code='EMPLOYEE';
