-- Spring Security's JDBC WebAuthn repositories persist the user entity ID as
-- a Base64URL string. V2 incorrectly declared these two columns as BYTEA,
-- which makes credential enrollment fail when PostgreSQL compares them to a
-- VARCHAR prepared-statement parameter.
ALTER TABLE user_credentials
  DROP CONSTRAINT user_credentials_user_entity_user_id_fkey;

ALTER TABLE user_entities
  ALTER COLUMN id TYPE VARCHAR(255)
  USING encode(id, 'base64');

ALTER TABLE user_credentials
  ALTER COLUMN user_entity_user_id TYPE VARCHAR(255)
  USING encode(user_entity_user_id, 'base64');

ALTER TABLE user_credentials
  ADD CONSTRAINT user_credentials_user_entity_user_id_fkey
  FOREIGN KEY (user_entity_user_id) REFERENCES user_entities(id) ON DELETE CASCADE;
