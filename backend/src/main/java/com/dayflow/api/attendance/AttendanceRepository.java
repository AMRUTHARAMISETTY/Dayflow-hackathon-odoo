package com.dayflow.api.attendance;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AttendanceRepository {
  private static final String SELECT = """
      select id, employee_id, work_date, check_in, check_out, status, late_minutes, early_departure_minutes,
             overtime_minutes, missing_checkout_notified, source
      from attendance_records
      """;

  private final JdbcTemplate jdbc;

  public AttendanceRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Optional<AttendanceRecord> findByEmployeeAndDate(long employeeId, LocalDate date) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where employee_id = ? and work_date = ?", this::map, employeeId, date));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  /** employeeId -> record, for a single date across many employees (used to resolve a day view). */
  public Map<Long, AttendanceRecord> findForDate(List<Long> employeeIds, LocalDate date) {
    if (employeeIds.isEmpty()) {
      return Map.of();
    }
    String placeholders = employeeIds.stream().map(id -> "?").collect(Collectors.joining(","));
    Object[] args = java.util.stream.Stream.concat(employeeIds.stream(), java.util.stream.Stream.of(date)).toArray();
    List<AttendanceRecord> rows = jdbc.query(
        SELECT + " where employee_id in (" + placeholders + ") and work_date = ?", this::map, args);
    return rows.stream().collect(Collectors.toMap(AttendanceRecord::employeeId, row -> row));
  }

  public List<AttendanceRecord> findRange(long employeeId, LocalDate from, LocalDate to) {
    return jdbc.query(SELECT + " where employee_id = ? and work_date between ? and ? order by work_date", this::map, employeeId, from, to);
  }

  public long checkIn(long employeeId, LocalDate date, LocalDateTime checkInAt) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into attendance_records(employee_id, work_date, check_in, status) values (?, ?, ?, 'Present')",
          new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setObject(2, date);
      ps.setTimestamp(3, Timestamp.valueOf(checkInAt));
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void checkOut(long recordId, LocalDateTime checkOutAt, int lateMinutes, int earlyDepartureMinutes, int overtimeMinutes) {
    jdbc.update("""
        update attendance_records
        set check_out = ?, late_minutes = ?, early_departure_minutes = ?, overtime_minutes = ?, updated_at = current_timestamp
        where id = ?
        """, Timestamp.valueOf(checkOutAt), lateMinutes, earlyDepartureMinutes, overtimeMinutes, recordId);
  }

  /** Records late-arrival minutes at check-in time too, so a "present but late" state is visible
   * before checkout happens. */
  public void updateLateMinutes(long recordId, int lateMinutes) {
    jdbc.update("update attendance_records set late_minutes = ?, updated_at = current_timestamp where id = ?", lateMinutes, recordId);
  }

  public void upsertLeaveDay(long employeeId, LocalDate date) {
    Optional<AttendanceRecord> existing = findByEmployeeAndDate(employeeId, date);
    if (existing.isPresent()) {
      return;
    }
    jdbc.update("insert into attendance_records(employee_id, work_date, status, source) values (?, ?, 'On Leave', 'LEAVE_SYNC')", employeeId, date);
  }

  public void removeLeaveSyncedDay(long employeeId, LocalDate date) {
    jdbc.update("delete from attendance_records where employee_id = ? and work_date = ? and source = 'LEAVE_SYNC'", employeeId, date);
  }

  public void applyCorrection(long employeeId, LocalDate date, LocalDateTime checkIn, LocalDateTime checkOut,
      int lateMinutes, int earlyDepartureMinutes, int overtimeMinutes) {
    Optional<AttendanceRecord> existing = findByEmployeeAndDate(employeeId, date);
    if (existing.isPresent()) {
      jdbc.update("""
          update attendance_records set check_in = ?, check_out = ?, status = 'Present', late_minutes = ?,
                 early_departure_minutes = ?, overtime_minutes = ?, source = 'CORRECTION', updated_at = current_timestamp
          where id = ?
          """, checkIn == null ? null : Timestamp.valueOf(checkIn), checkOut == null ? null : Timestamp.valueOf(checkOut),
          lateMinutes, earlyDepartureMinutes, overtimeMinutes, existing.get().id());
    } else {
      jdbc.update("""
          insert into attendance_records(employee_id, work_date, check_in, check_out, status, late_minutes,
                                          early_departure_minutes, overtime_minutes, source)
          values (?, ?, ?, ?, 'Present', ?, ?, ?, 'CORRECTION')
          """, employeeId, date, checkIn == null ? null : Timestamp.valueOf(checkIn),
          checkOut == null ? null : Timestamp.valueOf(checkOut), lateMinutes, earlyDepartureMinutes, overtimeMinutes);
    }
  }

  public List<AttendanceRecord> findMissingCheckoutCandidates(LocalDate before) {
    return jdbc.query(SELECT + " where work_date < ? and check_out is null and check_in is not null and missing_checkout_notified = false",
        this::map, before);
  }

  public void markMissingCheckoutNotified(long recordId) {
    jdbc.update("update attendance_records set missing_checkout_notified = true where id = ?", recordId);
  }

  private AttendanceRecord map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp checkIn = rs.getTimestamp("check_in");
    Timestamp checkOut = rs.getTimestamp("check_out");
    return new AttendanceRecord(
        rs.getLong("id"),
        rs.getLong("employee_id"),
        rs.getDate("work_date").toLocalDate(),
        checkIn == null ? null : checkIn.toLocalDateTime(),
        checkOut == null ? null : checkOut.toLocalDateTime(),
        rs.getString("status"),
        rs.getInt("late_minutes"),
        rs.getInt("early_departure_minutes"),
        rs.getInt("overtime_minutes"),
        rs.getBoolean("missing_checkout_notified"),
        rs.getString("source"));
  }
}
