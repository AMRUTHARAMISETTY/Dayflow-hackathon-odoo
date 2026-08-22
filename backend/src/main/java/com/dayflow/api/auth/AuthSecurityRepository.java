package com.dayflow.api.auth;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class AuthSecurityRepository {
  private final JdbcTemplate jdbc;

  AuthSecurityRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  record PasskeyView(long id, String credentialId, String deviceName, String transports, LocalDateTime createdAt,
      LocalDateTime lastUsedAt) {
  }

  record PasskeyCredential(long id, long userId, String credentialId, String publicKey, long signCount) {
  }

  record SecurityEventView(long id, String eventType, String severity, String detail, String ipAddress,
      LocalDateTime createdAt) {
  }

  void insertLoginAttempt(String identifier, boolean success, String ip) {
    jdbc.update("insert into login_attempts(identifier, success, ip_address) values (?, ?, ?)", identifier, success, ip);
  }

  int recentFailedAttempts(String identifier) {
    Integer count = jdbc.queryForObject("""
        select count(*) from login_attempts
        where lower(identifier) = lower(?) and success = false and created_at > current_timestamp - interval '15 minutes'
        """, Integer.class, identifier);
    return count == null ? 0 : count;
  }

  void insertSecurityEvent(Long userId, String eventType, String severity, String detail, String ip) {
    jdbc.update("""
        insert into security_events(user_id, event_type, severity, detail, ip_address) values (?, ?, ?, ?, ?)
        """, userId, eventType, severity, detail, ip);
  }

  List<SecurityEventView> securityEvents(long userId) {
    return jdbc.query("""
        select id, event_type, severity, detail, ip_address, created_at
        from security_events where user_id = ?
        order by created_at desc limit 50
        """, (rs, rowNum) -> new SecurityEventView(
            rs.getLong("id"), rs.getString("event_type"), rs.getString("severity"), rs.getString("detail"),
            rs.getString("ip_address"), rs.getTimestamp("created_at").toLocalDateTime()), userId);
  }

  String createChallenge(Long userId, String challengeHash, String purpose, LocalDateTime expiresAt) {
    jdbc.update("""
        insert into auth_challenges(user_id, challenge_hash, purpose, expires_at) values (?, ?, ?, ?)
        """, userId, challengeHash, purpose, expiresAt);
    return challengeHash;
  }

  boolean consumeChallenge(String challengeHash, String purpose) {
    return jdbc.update("""
        update auth_challenges set used_at = current_timestamp
        where challenge_hash = ? and purpose = ? and used_at is null and expires_at > current_timestamp
        """, challengeHash, purpose) > 0;
  }

  long savePasskey(long userId, String credentialId, String publicKey, String deviceName, String transports) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into webauthn_credentials(user_id, credential_id, public_key, device_name, transports)
          values (?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, userId);
      ps.setString(2, credentialId);
      ps.setString(3, publicKey);
      ps.setString(4, deviceName);
      ps.setString(5, transports);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  Optional<PasskeyCredential> findCredential(String credentialId) {
    try {
      return Optional.of(jdbc.queryForObject("""
          select id, user_id, credential_id, public_key, sign_count from webauthn_credentials where credential_id = ?
          """, (rs, rowNum) -> new PasskeyCredential(
              rs.getLong("id"), rs.getLong("user_id"), rs.getString("credential_id"), rs.getString("public_key"),
              rs.getLong("sign_count")), credentialId));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  List<PasskeyView> passkeys(long userId) {
    return jdbc.query("""
        select id, credential_id, device_name, transports, created_at, last_used_at
        from webauthn_credentials where user_id = ? order by created_at desc
        """, (rs, rowNum) -> new PasskeyView(
            rs.getLong("id"), rs.getString("credential_id"), rs.getString("device_name"), rs.getString("transports"),
            rs.getTimestamp("created_at").toLocalDateTime(),
            rs.getTimestamp("last_used_at") == null ? null : rs.getTimestamp("last_used_at").toLocalDateTime()), userId);
  }

  boolean deletePasskey(long userId, String credentialId) {
    return jdbc.update("delete from webauthn_credentials where user_id = ? and credential_id = ?", userId, credentialId) > 0;
  }

  void touchPasskey(String credentialId) {
    jdbc.update("update webauthn_credentials set last_used_at = current_timestamp where credential_id = ?", credentialId);
  }

  String createPasswordResetToken(Long userId, String tokenHash, LocalDateTime expiresAt) {
    jdbc.update("insert into password_reset_tokens(user_id, token_hash, expires_at) values (?, ?, ?)",
        userId, tokenHash, expiresAt);
    return tokenHash;
  }

  Optional<Long> consumePasswordResetToken(String tokenHash) {
    try {
      Long userId = jdbc.queryForObject("""
          select user_id from password_reset_tokens
          where token_hash = ? and used_at is null and expires_at > current_timestamp
          """, Long.class, tokenHash);
      jdbc.update("update password_reset_tokens set used_at = current_timestamp where token_hash = ?", tokenHash);
      return Optional.ofNullable(userId);
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }
}
