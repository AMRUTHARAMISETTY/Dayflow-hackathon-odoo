package com.dayflow.auth.repo;

import com.dayflow.auth.model.AuthModels.User;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {
  private final JdbcClient db;
  public AuthRepository(JdbcClient db) { this.db = db; }

  public Optional<User> findUser(String identifier) {
    if (identifier == null || identifier.isBlank()) return Optional.empty();
    try {
      return findUser(UUID.fromString(identifier.trim()));
    } catch (IllegalArgumentException ignored) {
      // Normal login identifiers are company email addresses or employee IDs.
    }
    return db.sql("""
      SELECT u.*, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL),'{}') roles
      FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
      WHERE lower(u.email)=lower(:id) OR upper(u.employee_id)=upper(:id) GROUP BY u.id
      """).param("id", identifier.trim()).query(this::mapUser).optional();
  }

  public Optional<User> findUser(UUID id) {
    return db.sql("""
      SELECT u.*, COALESCE(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL),'{}') roles
      FROM users u LEFT JOIN user_roles ur ON ur.user_id=u.id LEFT JOIN roles r ON r.id=ur.role_id
      WHERE u.id=:id GROUP BY u.id
      """).param("id", id).query(this::mapUser).optional();
  }
  public Optional<User> findPendingEmployee(String employeeId,String email){return findUser(email).filter(u->employeeId.equalsIgnoreCase(u.employeeId())&&u.roles().contains("EMPLOYEE")&&"PENDING".equals(u.status()));}

  private User mapUser(ResultSet rs, int row) throws SQLException {
    String[] roles = (String[]) rs.getArray("roles").getArray();
    var locked = rs.getTimestamp("locked_until");
    return new User(rs.getObject("id", UUID.class), rs.getString("employee_id"), rs.getString("email"),
      rs.getString("display_name"), rs.getString("password_hash"), rs.getString("status"), rs.getBoolean("email_verified"),
      rs.getInt("failed_attempts"), locked == null ? null : locked.toInstant(), Set.of(roles));
  }

  public void loginAttempt(String identifierHash, UUID userId, boolean success, String ipHash) {
    db.sql("INSERT INTO login_attempts(identifier_hash,user_id,successful,ip_hash) VALUES(:i,:u,:s,:ip)")
      .param("i", identifierHash).param("u", userId).param("s", success).param("ip", ipHash).update();
  }
  public void failedLogin(UUID id, int attempts, Instant lockedUntil) {
    db.sql("UPDATE users SET failed_attempts=:a,locked_until=:l,updated_at=now() WHERE id=:id")
      .param("a", attempts).param("l", lockedUntil == null ? null : Timestamp.from(lockedUntil)).param("id", id).update();
  }
  public void successfulLogin(UUID id) { db.sql("UPDATE users SET failed_attempts=0,locked_until=NULL,updated_at=now() WHERE id=:id").param("id", id).update(); }
  public UUID createRefreshSession(UUID userId, String tokenHash, String device, String uaHash, String ipPrefix, Instant expires) {
    return db.sql("INSERT INTO refresh_sessions(user_id,token_hash,device_name,user_agent_hash,ip_prefix,expires_at) VALUES(:u,:t,:d,:a,:ip,:e) RETURNING id")
      .param("u",userId).param("t",tokenHash).param("d",device).param("a",uaHash).param("ip",ipPrefix).param("e",Timestamp.from(expires)).query(UUID.class).single();
  }
  public Optional<Map<String,Object>> refreshSession(String hash) {
    return db.sql("SELECT id,user_id,expires_at,revoked_at,replaced_by FROM refresh_sessions WHERE token_hash=:h FOR UPDATE").param("h",hash).query().listOfRows().stream().findFirst();
  }
  public void rotateSession(UUID oldId, UUID replacement) { db.sql("UPDATE refresh_sessions SET revoked_at=now(),replaced_by=:r,last_used_at=now() WHERE id=:id").param("r",replacement).param("id",oldId).update(); }
  public void revokeSession(UUID id, UUID userId) { db.sql("UPDATE refresh_sessions SET revoked_at=now() WHERE id=:id AND user_id=:u AND revoked_at IS NULL").param("id",id).param("u",userId).update(); }
  public void revokeAll(UUID userId) { db.sql("UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=:u AND revoked_at IS NULL").param("u",userId).update(); }
  public List<Map<String,Object>> sessions(UUID userId) { return db.sql("SELECT id,device_name,ip_prefix,created_at,last_used_at FROM refresh_sessions WHERE user_id=:u AND revoked_at IS NULL AND expires_at>now() ORDER BY last_used_at DESC").param("u",userId).query().listOfRows(); }
  public void securityEvent(UUID userId, String type, String severity, String ipHash, String agent) {
    db.sql("INSERT INTO security_events(user_id,event_type,severity,ip_hash,user_agent) VALUES(:u,:t,:s,:ip,:a)")
      .param("u",userId).param("t",type).param("s",severity).param("ip",ipHash).param("a",agent == null ? null : agent.substring(0,Math.min(255,agent.length()))).update();
  }
  public List<Map<String,Object>> securityEvents(UUID userId) { return db.sql("SELECT id,event_type,severity,metadata,created_at FROM security_events WHERE user_id=:u ORDER BY created_at DESC LIMIT 100").param("u",userId).query().listOfRows(); }
  public void storeOtp(UUID userId, String purpose, String hash, Instant expires) {
    db.sql("UPDATE email_verification_tokens SET consumed_at=now() WHERE user_id=:u AND purpose=:p AND consumed_at IS NULL").param("u",userId).param("p",purpose).update();
    db.sql("INSERT INTO email_verification_tokens(user_id,purpose,token_hash,expires_at) VALUES(:u,:p,:h,:e)").param("u",userId).param("p",purpose).param("h",hash).param("e",Timestamp.from(expires)).update();
  }
  public boolean consumeOtp(UUID userId, String purpose, String hash) {
    return db.sql("UPDATE email_verification_tokens SET consumed_at=now() WHERE user_id=:u AND purpose=:p AND token_hash=:h AND consumed_at IS NULL AND expires_at>now() AND attempts<5")
      .param("u",userId).param("p",purpose).param("h",hash).update() == 1;
  }
  public void storeReset(UUID userId, String hash, Instant expires) { db.sql("INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(:u,:h,:e)").param("u",userId).param("h",hash).param("e",Timestamp.from(expires)).update(); }
  public Optional<UUID> consumeReset(String hash) { return db.sql("UPDATE password_reset_tokens SET consumed_at=now() WHERE token_hash=:h AND consumed_at IS NULL AND expires_at>now() RETURNING user_id").param("h",hash).query(UUID.class).optional(); }
  public void updatePassword(UUID userId, String hash) { db.sql("UPDATE users SET password_hash=:h,password_changed_at=now(),failed_attempts=0,locked_until=NULL WHERE id=:u").param("h",hash).param("u",userId).update(); }
  public void activate(UUID userId,String hash){db.sql("UPDATE users SET password_hash=:h,status='ACTIVE',email_verified=true,activated_at=now(),password_changed_at=now() WHERE id=:u AND status='PENDING'").param("h",hash).param("u",userId).update();}
}
