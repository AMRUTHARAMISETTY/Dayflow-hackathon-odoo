package com.dayflow.api.audit;

import com.dayflow.api.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuditRepository {
  private final JdbcTemplate jdbc;

  public AuditRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void insert(Long actorUserId, String action, String entity, String entityId, String previousValue,
      String newValue, String reason, String requestId, String ipAddress) {
    jdbc.update("""
        insert into audit_logs(actor_user_id, action, entity, entity_id, previous_value, new_value, reason, request_id, ip_address)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, actorUserId, action, entity, entityId, previousValue, newValue, reason, requestId, ipAddress);
  }

  public PageResponse<AuditLogEntry> search(String entity, String action, Long actorUserId, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (entity != null && !entity.isBlank()) {
      where.append(" and a.entity = ? ");
      args.add(entity);
    }
    if (action != null && !action.isBlank()) {
      where.append(" and a.action = ? ");
      args.add(action);
    }
    if (actorUserId != null) {
      where.append(" and a.actor_user_id = ? ");
      args.add(actorUserId);
    }
    String baseQuery = """
        select a.id, a.actor_user_id, coalesce(e.name, 'System') actor_name, a.action, a.entity, a.entity_id,
               a.previous_value, a.new_value, a.reason, a.request_id, a.ip_address, a.created_at
        from audit_logs a
        left join users u on u.id = a.actor_user_id
        left join employees e on e.id = u.employee_id
        """ + where + " order by a.created_at desc limit ? offset ? ";
    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<AuditLogEntry> items = jdbc.query(baseQuery, this::map, pagedArgs.toArray());

    String countQuery = "select count(*) from audit_logs a " + where;
    long total = jdbc.queryForObject(countQuery, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  private AuditLogEntry map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp createdAt = rs.getTimestamp("created_at");
    Long actorUserId = (Long) rs.getObject("actor_user_id");
    return new AuditLogEntry(
        rs.getLong("id"),
        actorUserId,
        rs.getString("actor_name"),
        rs.getString("action"),
        rs.getString("entity"),
        rs.getString("entity_id"),
        rs.getString("previous_value"),
        rs.getString("new_value"),
        rs.getString("reason"),
        rs.getString("request_id"),
        rs.getString("ip_address"),
        createdAt.toLocalDateTime());
  }
}
