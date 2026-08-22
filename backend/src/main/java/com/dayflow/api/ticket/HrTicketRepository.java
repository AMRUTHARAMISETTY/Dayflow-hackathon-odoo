package com.dayflow.api.ticket;

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
public class HrTicketRepository {
  private static final String SELECT = """
      select t.id, t.employee_id, e.name employee_name, t.category, t.subject, t.description, t.status,
             t.priority, t.confidential, coalesce(ae.name, null) assigned_to_name, t.assigned_to_user_id,
             t.sla_due_at, t.resolved_at, t.closed_at, t.satisfaction_rating, t.created_at, t.updated_at
      from hr_tickets t
      join employees e on e.id = t.employee_id
      left join users au on au.id = t.assigned_to_user_id
      left join employees ae on ae.id = au.employee_id
      """;

  private final JdbcTemplate jdbc;

  public HrTicketRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long employeeId, String category, String subject, String description, String priority,
      boolean confidential, LocalDateTime slaDueAt) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into hr_tickets(employee_id, category, subject, description, priority, confidential, sla_due_at)
          values (?, ?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setString(2, category);
      ps.setString(3, subject);
      ps.setString(4, description);
      ps.setString(5, priority);
      ps.setBoolean(6, confidential);
      ps.setTimestamp(7, Timestamp.valueOf(slaDueAt));
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<HrTicket> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where t.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public PageResponse<HrTicket> search(String status, String category, Long employeeId, boolean includeConfidential,
      int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (status != null && !status.isBlank()) {
      where.append(" and t.status = ? ");
      args.add(status);
    }
    if (category != null && !category.isBlank()) {
      where.append(" and t.category = ? ");
      args.add(category);
    }
    if (employeeId != null) {
      where.append(" and t.employee_id = ? ");
      args.add(employeeId);
    }
    if (!includeConfidential) {
      where.append(" and t.confidential = false ");
    }
    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<HrTicket> items = jdbc.query(SELECT + where + " order by t.sla_due_at limit ? offset ? ", this::map, pagedArgs.toArray());
    long total = jdbc.queryForObject("select count(*) from hr_tickets t " + where, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  public void assign(long id, long assignedToUserId) {
    jdbc.update("update hr_tickets set assigned_to_user_id = ?, status = case when status = 'OPEN' then 'ASSIGNED' else status end, updated_at = current_timestamp where id = ?",
        assignedToUserId, id);
  }

  public void updateStatus(long id, String status) {
    String extra = switch (status) {
      case "RESOLVED" -> ", resolved_at = current_timestamp";
      case "CLOSED" -> ", closed_at = current_timestamp";
      default -> "";
    };
    jdbc.update("update hr_tickets set status = ?, updated_at = current_timestamp" + extra + " where id = ?", status, id);
  }

  public void updatePriority(long id, String priority) {
    jdbc.update("update hr_tickets set priority = ?, updated_at = current_timestamp where id = ?", priority, id);
  }

  public void rate(long id, int rating) {
    jdbc.update("update hr_tickets set satisfaction_rating = ?, updated_at = current_timestamp where id = ?", rating, id);
  }

  public List<AssignableStaff> findAssignableStaff() {
    return jdbc.query("""
        select u.id user_id, e.name, r.name role_name,
               exists(select 1 from role_permissions rp join permissions p on p.id = rp.permission_id
                      where rp.role_id = u.role_id and p.code = 'ticket:confidential:read') can_handle_confidential
        from users u
        join employees e on e.id = u.employee_id
        join roles r on r.id = u.role_id
        where u.active = true
          and exists(select 1 from role_permissions rp join permissions p on p.id = rp.permission_id
                      where rp.role_id = u.role_id and p.code = 'ticket:manage')
        order by e.name
        """, (rs, rowNum) -> new AssignableStaff(rs.getLong("user_id"), rs.getString("name"), rs.getString("role_name"),
            rs.getBoolean("can_handle_confidential")));
  }

  public int countByStatusNotIn(List<String> excludedStatuses) {
    String placeholders = String.join(",", excludedStatuses.stream().map(s -> "?").toList());
    Integer count = jdbc.queryForObject("select count(*) from hr_tickets where status not in (" + placeholders + ")",
        Integer.class, excludedStatuses.toArray());
    return count == null ? 0 : count;
  }

  private HrTicket map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp resolvedAt = rs.getTimestamp("resolved_at");
    Timestamp closedAt = rs.getTimestamp("closed_at");
    return new HrTicket(
        rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_name"), rs.getString("category"),
        rs.getString("subject"), rs.getString("description"), rs.getString("status"), rs.getString("priority"),
        rs.getBoolean("confidential"), rs.getString("assigned_to_name"), (Long) rs.getObject("assigned_to_user_id"),
        rs.getTimestamp("sla_due_at").toLocalDateTime(), resolvedAt == null ? null : resolvedAt.toLocalDateTime(),
        closedAt == null ? null : closedAt.toLocalDateTime(), (Integer) rs.getObject("satisfaction_rating"),
        rs.getTimestamp("created_at").toLocalDateTime(), rs.getTimestamp("updated_at").toLocalDateTime());
  }
}
