package com.dayflow.api.invitation;

import com.dayflow.api.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class InvitationRepository {
  private static final String BASE_SELECT = """
      select i.id, i.email, r.name role_name, i.employee_id, emp.name employee_name, i.status,
             coalesce(inviter_emp.name, 'System') invited_by_name, i.expires_at, i.accepted_at, i.created_at
      from invitations i
      join roles r on r.id = i.role_id
      left join employees emp on emp.id = i.employee_id
      left join users inviter on inviter.id = i.invited_by_user_id
      left join employees inviter_emp on inviter_emp.id = inviter.employee_id
      """;

  private final JdbcTemplate jdbc;

  InvitationRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  record PendingInvitation(long id, String email, long roleId, String roleName, Long employeeId,
      LocalDateTime expiresAt, String status) {
  }

  long create(String email, long roleId, Long employeeId, String tokenHash, LocalDateTime expiresAt, Long invitedByUserId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into invitations(email, role_id, employee_id, token_hash, expires_at, invited_by_user_id)
          values (?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setString(1, email);
      ps.setLong(2, roleId);
      if (employeeId != null) {
        ps.setLong(3, employeeId);
      } else {
        ps.setNull(3, java.sql.Types.BIGINT);
      }
      ps.setString(4, tokenHash);
      ps.setTimestamp(5, Timestamp.valueOf(expiresAt));
      if (invitedByUserId != null) {
        ps.setLong(6, invitedByUserId);
      } else {
        ps.setNull(6, java.sql.Types.BIGINT);
      }
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  Optional<PendingInvitation> findByTokenHash(String tokenHash) {
    try {
      return Optional.of(jdbc.queryForObject("""
          select id, email, role_id, r.name role_name, employee_id, expires_at, status
          from invitations i join roles r on r.id = i.role_id
          where token_hash = ?
          """, (rs, rowNum) -> new PendingInvitation(rs.getLong("id"), rs.getString("email"), rs.getLong("role_id"),
          rs.getString("role_name"), (Long) rs.getObject("employee_id"),
          rs.getTimestamp("expires_at").toLocalDateTime(), rs.getString("status")), tokenHash));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  void markAccepted(long id) {
    jdbc.update("update invitations set status = 'ACCEPTED', accepted_at = current_timestamp where id = ?", id);
  }

  void markRevoked(long id) {
    jdbc.update("update invitations set status = 'REVOKED', revoked_at = current_timestamp where id = ? and status = 'PENDING'", id);
  }

  int expirePastDue() {
    return jdbc.update("update invitations set status = 'EXPIRED' where status = 'PENDING' and expires_at < current_timestamp");
  }

  PageResponse<InvitationView> search(String status, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (status != null && !status.isBlank()) {
      where.append(" and i.status = ? ");
      args.add(status);
    }
    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<InvitationView> items = jdbc.query(
        BASE_SELECT + where + " order by i.created_at desc limit ? offset ? ", this::map, pagedArgs.toArray());
    long total = jdbc.queryForObject("select count(*) from invitations i " + where, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  Optional<InvitationView> findViewById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(BASE_SELECT + " where i.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  private InvitationView map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp accepted = rs.getTimestamp("accepted_at");
    return new InvitationView(
        rs.getLong("id"),
        rs.getString("email"),
        rs.getString("role_name"),
        (Long) rs.getObject("employee_id"),
        rs.getString("employee_name"),
        rs.getString("status"),
        rs.getString("invited_by_name"),
        rs.getTimestamp("expires_at").toLocalDateTime(),
        accepted == null ? null : accepted.toLocalDateTime(),
        rs.getTimestamp("created_at").toLocalDateTime());
  }
}
