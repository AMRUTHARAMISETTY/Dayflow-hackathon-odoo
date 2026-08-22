package com.dayflow.api.payroll;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PayrollAnomalyRepository {
  private static final String SELECT = """
      select a.id, a.payroll_run_id, a.employee_id, coalesce(e.name, null) employee_name, a.issue_code, a.severity,
             a.possible_cause, a.recommended_action, a.blocking, a.review_status, a.resolution_note,
             coalesce(re.name, null) reviewed_by_name, a.reviewed_at, a.created_at
      from payroll_anomalies a
      left join employees e on e.id = a.employee_id
      left join users u on u.id = a.reviewed_by_user_id
      left join employees re on re.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public PayrollAnomalyRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void deleteForRun(long payrollRunId) {
    jdbc.update("delete from payroll_anomalies where payroll_run_id = ?", payrollRunId);
  }

  public void insert(long payrollRunId, Long employeeId, String issueCode, String severity, String possibleCause,
      String recommendedAction, boolean blocking) {
    jdbc.update("""
        insert into payroll_anomalies(payroll_run_id, employee_id, issue_code, severity, possible_cause,
                                       recommended_action, blocking)
        values (?, ?, ?, ?, ?, ?, ?)
        """, payrollRunId, employeeId, issueCode, severity, possibleCause, recommendedAction, blocking);
  }

  public List<PayrollAnomaly> forRun(long payrollRunId) {
    return jdbc.query(SELECT + " where a.payroll_run_id = ? order by a.blocking desc, a.severity, a.id", this::map, payrollRunId);
  }

  /** Across every run that hasn't reached PAID yet — used by the HR dashboard's KPI card. */
  public int countAllOpenActionable() {
    Integer count = jdbc.queryForObject("""
        select count(*) from payroll_anomalies a
        join payroll_runs r on r.id = a.payroll_run_id
        where a.review_status = 'OPEN' and r.status <> 'PAID'
        """, Integer.class);
    return count == null ? 0 : count;
  }

  public int countOpenBlocking(long payrollRunId) {
    Integer count = jdbc.queryForObject(
        "select count(*) from payroll_anomalies where payroll_run_id = ? and blocking = true and review_status = 'OPEN'",
        Integer.class, payrollRunId);
    return count == null ? 0 : count;
  }

  public Optional<PayrollAnomaly> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where a.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public void resolve(long id, String reviewStatus, String resolutionNote, long reviewedByUserId) {
    jdbc.update("""
        update payroll_anomalies set review_status = ?, resolution_note = ?, reviewed_by_user_id = ?, reviewed_at = current_timestamp
        where id = ?
        """, reviewStatus, resolutionNote, reviewedByUserId, id);
  }

  private PayrollAnomaly map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp reviewedAt = rs.getTimestamp("reviewed_at");
    return new PayrollAnomaly(
        rs.getLong("id"), rs.getLong("payroll_run_id"), (Long) rs.getObject("employee_id"), rs.getString("employee_name"),
        rs.getString("issue_code"), rs.getString("severity"), rs.getString("possible_cause"), rs.getString("recommended_action"),
        rs.getBoolean("blocking"), rs.getString("review_status"), rs.getString("resolution_note"), rs.getString("reviewed_by_name"),
        reviewedAt == null ? null : reviewedAt.toLocalDateTime(), rs.getTimestamp("created_at").toLocalDateTime());
  }
}
