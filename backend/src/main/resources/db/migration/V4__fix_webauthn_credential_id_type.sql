-- Credential IDs are also Base64URL strings in Spring Security's JDBC
-- WebAuthn repository. Keeping this as BYTEA breaks credential lookup during
-- registration and authentication.
ALTER TABLE user_credentials
  ALTER COLUMN credential_id TYPE VARCHAR(1024)
  USING encode(credential_id, 'base64');
