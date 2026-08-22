CREATE TABLE user_entities (
  id BYTEA PRIMARY KEY,
  name VARCHAR(320) UNIQUE NOT NULL,
  display_name VARCHAR(160) NOT NULL
);
CREATE TABLE user_credentials (
  credential_id BYTEA PRIMARY KEY,
  user_entity_user_id BYTEA NOT NULL REFERENCES user_entities(id) ON DELETE CASCADE,
  public_key BYTEA NOT NULL,
  signature_count BIGINT NOT NULL,
  uv_initialized BOOLEAN NOT NULL,
  backup_eligible BOOLEAN NOT NULL,
  authenticator_transports VARCHAR(255),
  public_key_credential_type VARCHAR(32) NOT NULL,
  backup_state BOOLEAN NOT NULL,
  attestation_object BYTEA,
  attestation_client_data_json BYTEA,
  created TIMESTAMPTZ NOT NULL,
  last_used TIMESTAMPTZ,
  label VARCHAR(120)
);
CREATE INDEX user_credentials_user_id ON user_credentials(user_entity_user_id);
