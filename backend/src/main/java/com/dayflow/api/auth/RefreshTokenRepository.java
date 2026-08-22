package com.dayflow.api.auth;

import java.time.LocalDateTime;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class RefreshTokenRepository {
  private final JdbcTemplate jdbc;

  RefreshTokenRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  record ActiveToken(long id, long userId, LocalDateTime expiresAt, LocalDateTime revokedAt) {
    boolean isUsable() {
      return revokedAt == null && expiresAt.isAfter(LocalDateTime.now());
    }
  }

  void insert(long userId, String tokenHash, LocalDateTime expiresAt, String ip) {
    jdbc.update("insert into refresh_tokens(user_id, token_hash, expires_at, created_ip) values (?, ?, ?, ?)",
        userId, tokenHash, expiresAt, ip);
  }

  Optional<ActiveToken> findByHash(String tokenHash) {
    try {
      return Optional.of(jdbc.queryForObject(
          "select id, user_id, expires_at, revoked_at from refresh_tokens where token_hash = ?",
          (rs, rowNum) -> new ActiveToken(
              rs.getLong("id"),
              rs.getLong("user_id"),
              rs.getTimestamp("expires_at").toLocalDateTime(),
              rs.getTimestamp("revoked_at") == null ? null : rs.getTimestamp("revoked_at").toLocalDateTime()),
          tokenHash));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  void revoke(String tokenHash, String replacedByHash) {
    jdbc.update("update refresh_tokens set revoked_at = current_timestamp, replaced_by_hash = ? where token_hash = ?",
        replacedByHash, tokenHash);
  }

  void revokeAllForUser(long userId) {
    jdbc.update("update refresh_tokens set revoked_at = current_timestamp where user_id = ? and revoked_at is null", userId);
  }
}
