package com.dayflow.api.user;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {
  private static final String BASE_SELECT = """
      select u.id, u.employee_id, emp.employee_code, emp.name employee_name, emp.status employee_status,
        u.email, u.password_hash, u.role_id, r.name role_name, u.active
      from users u
      join roles r on r.id = u.role_id
      join employees emp on emp.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public UserRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<UserAccount> findByEmail(String email) {
    return query(BASE_SELECT + " where lower(u.email) = lower(?) and u.active = true", email);
  }

  public Optional<UserAccount> findByIdentifier(String identifier) {
    String trimmed = identifier == null ? "" : identifier.trim();
    if (trimmed.contains("@")) {
      return findByEmail(trimmed);
    }
    return queryArgs(BASE_SELECT + " where (lower(u.email) = lower(?) or lower(emp.employee_code) = lower(?)) and u.active = true",
        trimmed, trimmed);
  }

  public Optional<UserAccount> findById(long id) {
    return query(BASE_SELECT + " where u.id = ? and u.active = true", id);
  }

  public Optional<UserAccount> findByEmployeeId(long employeeId) {
    return query(BASE_SELECT + " where u.employee_id = ? and u.active = true", employeeId);
  }

  public List<Long> findUserIdsByRoles(List<String> roleNames) {
    if (roleNames.isEmpty()) {
      return List.of();
    }
    String placeholders = String.join(",", roleNames.stream().map(name -> "?").toList());
    return jdbc.queryForList(
        "select u.id from users u join roles r on r.id = u.role_id where u.active = true and r.name in (" + placeholders + ")",
        Long.class, roleNames.toArray());
  }

  public boolean existsByEmail(String email) {
    Integer count = jdbc.queryForObject("select count(*) from users where lower(email) = lower(?)", Integer.class, email);
    return count != null && count > 0;
  }

  public long create(long employeeId, String email, String passwordHash, long roleId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into users(employee_id, email, password_hash, role_id) values (?, ?, ?, ?)", new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setString(2, email);
      ps.setString(3, passwordHash);
      ps.setLong(4, roleId);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void markLoggedIn(long userId) {
    jdbc.update("update users set last_login_at = current_timestamp where id = ?", userId);
  }

  public void updatePassword(long userId, String passwordHash) {
    jdbc.update("update users set password_hash = ? where id = ?", passwordHash, userId);
  }

  private Optional<UserAccount> query(String sql, Object arg) {
    return queryArgs(sql, arg);
  }

  private Optional<UserAccount> queryArgs(String sql, Object... args) {
    try {
      UserAccount base = jdbc.queryForObject(sql, this::mapWithoutPermissions, args);
      Set<String> permissions = Set.copyOf(jdbc.queryForList("""
          select p.code from permissions p
          join role_permissions rp on rp.permission_id = p.id
          where rp.role_id = ? order by p.code
          """, String.class, base.roleId()));
      return Optional.of(new UserAccount(base.id(), base.employeeId(), base.employeeCode(), base.employeeName(),
          base.email(), base.passwordHash(), base.roleId(), base.roleName(), base.active(), base.employeeStatus(),
          permissions));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  private UserAccount mapWithoutPermissions(ResultSet rs, int rowNum) throws SQLException {
    return new UserAccount(rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_code"),
        rs.getString("employee_name"), rs.getString("email"), rs.getString("password_hash"), rs.getLong("role_id"),
        rs.getString("role_name"), rs.getBoolean("active"), rs.getString("employee_status"), Set.of());
  }
}
