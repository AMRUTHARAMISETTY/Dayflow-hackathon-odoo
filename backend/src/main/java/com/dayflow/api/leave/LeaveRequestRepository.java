package com.dayflow.api.leave;

import com.dayflow.api.common.PageResponse;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class LeaveRequestRepository {
  private static final String SELECT = """
      select l.id, l.employee_id, e.name employee_name, l.leave_type_id, lt.name leave_type_name, l.start_date,
             l.end_date, l.days, l.reason, l.status, coalesce(ae.name, null) approver_name, l.decision_reason,
             l.auto_approved, l.created_at, l.decided_at, l.cancelled_at
      from leave_requests l
      join employees e on e.id = l.employee_id
      join leave_types lt on lt.id = l.leave_type_id
      left join users u on u.id = l.approver_user_id
      left join employees ae on ae.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public LeaveRequestRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public boolean overlapExists(long employeeId, LocalDate start, LocalDate end) {
    Integer count = jdbc.queryForObject("""
        select count(*) from leave_requests
        where employee_id = ? and status in ('PENDING','APPROVED') and start_date <= ? and end_date >= ?
        """, Integer.class, employeeId, end, start);
    return count != null && count > 0;
  }

  public long create(long employeeId, long leaveTypeId, LocalDate start, LocalDate end, BigDecimal days, String reason,
      String status, Long approverUserId, boolean autoApproved) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into leave_requests(employee_id, leave_type_id, start_date, end_date, days, reason, status,
                                      approver_user_id, auto_approved, decided_at)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setLong(2, leaveTypeId);
      ps.setObject(3, start);
      ps.setObject(4, end);
      ps.setBigDecimal(5, days);
      ps.setString(6, reason);
      ps.setString(7, status);
      if (approverUserId != null) {
        ps.setLong(8, approverUserId);
      } else {
        ps.setNull(8, java.sql.Types.BIGINT);
      }
      ps.setBoolean(9, autoApproved);
      ps.setTimestamp(10, autoApproved ? Timestamp.valueOf(java.time.LocalDateTime.now()) : null);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<LeaveRequest> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where l.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public void decide(long id, boolean approve, String reason, long approverUserId) {
    jdbc.update("""
        update leave_requests set status = ?, decision_reason = ?, approver_user_id = ?, decided_at = current_timestamp
        where id = ?
        """, approve ? "APPROVED" : "REJECTED", reason, approverUserId, id);
  }

  public void cancel(long id) {
    jdbc.update("update leave_requests set status = 'CANCELLED', cancelled_at = current_timestamp where id = ?", id);
  }

  /** Pending requests older than {@code cutoff} that haven't had a reminder sent yet. */
  public List<LeaveRequest> findPendingNeedingReminder(java.time.LocalDateTime cutoff) {
    return jdbc.query(SELECT + " where l.status = 'PENDING' and l.created_at <= ? and l.reminder_sent_at is null",
        this::map, cutoff);
  }

  /** Pending requests older than {@code cutoff} that haven't been escalated to HR yet. */
  public List<LeaveRequest> findPendingNeedingEscalation(java.time.LocalDateTime cutoff) {
    return jdbc.query(SELECT + " where l.status = 'PENDING' and l.created_at <= ? and l.escalated_at is null",
        this::map, cutoff);
  }

  public void markReminderSent(long id) {
    jdbc.update("update leave_requests set reminder_sent_at = current_timestamp where id = ?", id);
  }

  public void markEscalated(long id) {
    jdbc.update("update leave_requests set escalated_at = current_timestamp where id = ?", id);
  }

  public PageResponse<LeaveRequest> search(String status, Long employeeId, Long restrictEmployeeId, Long restrictManagerId,
      int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (status != null && !status.isBlank()) {
      where.append(" and l.status = ? ");
      args.add(status);
    }
    if (employeeId != null) {
      where.append(" and l.employee_id = ? ");
      args.add(employeeId);
    }
    if (restrictEmployeeId != null && restrictManagerId != null) {
      where.append(" and (l.employee_id = ? or e.manager_id = ?) ");
      args.add(restrictEmployeeId);
      args.add(restrictManagerId);
    } else if (restrictEmployeeId != null) {
      where.append(" and l.employee_id = ? ");
      args.add(restrictEmployeeId);
    }
    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<LeaveRequest> items = jdbc.query(SELECT + where + " order by l.created_at desc limit ? offset ? ", this::map, pagedArgs.toArray());
    long total = jdbc.queryForObject("select count(*) from leave_requests l join employees e on e.id = l.employee_id " + where,
        Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  /** Approved leave overlapping [from, to], for the dashboard's 7-day availability widget. */
  public List<LeaveRequest> findApprovedInRange(LocalDate from, LocalDate to, Long restrictEmployeeId, Long restrictManagerId) {
    List<Object> args = new ArrayList<>();
    args.add(to);
    args.add(from);
    StringBuilder where = new StringBuilder(" where l.status = 'APPROVED' and l.start_date <= ? and l.end_date >= ? ");
    if (restrictEmployeeId != null && restrictManagerId != null) {
      where.append(" and (l.employee_id = ? or e.manager_id = ?) ");
      args.add(restrictEmployeeId);
      args.add(restrictManagerId);
    } else if (restrictEmployeeId != null) {
      where.append(" and l.employee_id = ? ");
      args.add(restrictEmployeeId);
    }
    return jdbc.query(SELECT + where + " order by l.start_date", this::map, args.toArray());
  }

  private LeaveRequest map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp decidedAt = rs.getTimestamp("decided_at");
    Timestamp cancelledAt = rs.getTimestamp("cancelled_at");
    return new LeaveRequest(
        rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_name"), rs.getLong("leave_type_id"),
        rs.getString("leave_type_name"), rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate(),
        rs.getBigDecimal("days"), rs.getString("reason"), rs.getString("status"), rs.getString("approver_name"),
        rs.getString("decision_reason"), rs.getBoolean("auto_approved"), rs.getTimestamp("created_at").toLocalDateTime(),
        decidedAt == null ? null : decidedAt.toLocalDateTime(), cancelledAt == null ? null : cancelledAt.toLocalDateTime());
  }
}
