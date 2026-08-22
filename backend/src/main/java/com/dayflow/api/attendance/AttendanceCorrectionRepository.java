package com.dayflow.api.attendance;

import com.dayflow.api.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
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
public class AttendanceCorrectionRepository {
  private static final String SELECT = """
      select c.id, c.employee_id, e.name employee_name, c.work_date, c.requested_check_in, c.requested_check_out,
             c.reason, c.evidence_note, c.status, coalesce(de.name, null) decided_by_name, c.decision_reason,
             c.created_at, c.decided_at
      from attendance_corrections c
      join employees e on e.id = c.employee_id
      left join users u on u.id = c.decided_by_user_id
      left join employees de on de.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public AttendanceCorrectionRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long employeeId, LocalDate workDate, LocalDateTime requestedCheckIn, LocalDateTime requestedCheckOut,
      String reason, String evidenceNote) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into attendance_corrections(employee_id, work_date, requested_check_in, requested_check_out, reason, evidence_note)
          values (?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setObject(2, workDate);
      ps.setTimestamp(3, requestedCheckIn == null ? null : Timestamp.valueOf(requestedCheckIn));
      ps.setTimestamp(4, requestedCheckOut == null ? null : Timestamp.valueOf(requestedCheckOut));
      ps.setString(5, reason);
      ps.setString(6, evidenceNote);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<AttendanceCorrection> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where c.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public void decide(long id, boolean approve, String reason, long decidedByUserId) {
    jdbc.update("""
        update attendance_corrections set status = ?, decision_reason = ?, decided_by_user_id = ?, decided_at = current_timestamp
        where id = ?
        """, approve ? "APPROVED" : "REJECTED", reason, decidedByUserId, id);
  }

  public PageResponse<AttendanceCorrection> search(String status, Long employeeId, Long restrictEmployeeId,
      Long restrictManagerId, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (status != null && !status.isBlank()) {
      where.append(" and c.status = ? ");
      args.add(status);
    }
    if (employeeId != null) {
      where.append(" and c.employee_id = ? ");
      args.add(employeeId);
    }
    if (restrictEmployeeId != null && restrictManagerId != null) {
      where.append(" and (c.employee_id = ? or e.manager_id = ?) ");
      args.add(restrictEmployeeId);
      args.add(restrictManagerId);
    } else if (restrictEmployeeId != null) {
      where.append(" and c.employee_id = ? ");
      args.add(restrictEmployeeId);
    }
    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<AttendanceCorrection> items = jdbc.query(
        SELECT + where + " order by c.created_at desc limit ? offset ? ", this::map, pagedArgs.toArray());
    long total = jdbc.queryForObject("select count(*) from attendance_corrections c join employees e on e.id = c.employee_id " + where,
        Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  private AttendanceCorrection map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp reqIn = rs.getTimestamp("requested_check_in");
    Timestamp reqOut = rs.getTimestamp("requested_check_out");
    Timestamp decidedAt = rs.getTimestamp("decided_at");
    return new AttendanceCorrection(
        rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_name"), rs.getDate("work_date").toLocalDate(),
        reqIn == null ? null : reqIn.toLocalDateTime(), reqOut == null ? null : reqOut.toLocalDateTime(),
        rs.getString("reason"), rs.getString("evidence_note"), rs.getString("status"), rs.getString("decided_by_name"),
        rs.getString("decision_reason"), rs.getTimestamp("created_at").toLocalDateTime(),
        decidedAt == null ? null : decidedAt.toLocalDateTime());
  }
}
