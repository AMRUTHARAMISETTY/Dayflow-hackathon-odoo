package com.dayflow.api.payroll;

import com.dayflow.api.common.PageResponse;
import java.math.BigDecimal;
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
public class PayrollRunRepository {
  private static final String SELECT = """
      select r.id, r.period_month, r.status,
             coalesce(cbe.name, null) calculated_by_name, r.calculated_at,
             coalesce(abe.name, null) approved_by_name, r.approved_at, r.approval_reason,
             coalesce(pbe.name, null) published_by_name, r.published_at, r.paid_at,
             r.total_gross, r.total_deductions, r.total_net, r.employee_count,
             coalesce(crbe.name, 'System') created_by_name, r.created_at
      from payroll_runs r
      left join users cu on cu.id = r.calculated_by_user_id left join employees cbe on cbe.id = cu.employee_id
      left join users au on au.id = r.approved_by_user_id left join employees abe on abe.id = au.employee_id
      left join users pu on pu.id = r.published_by_user_id left join employees pbe on pbe.id = pu.employee_id
      left join users cru on cru.id = r.created_by_user_id left join employees crbe on crbe.id = cru.employee_id
      """;

  private final JdbcTemplate jdbc;

  public PayrollRunRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public boolean existsForPeriod(String periodMonth) {
    Integer count = jdbc.queryForObject("select count(*) from payroll_runs where period_month = ?", Integer.class, periodMonth);
    return count != null && count > 0;
  }

  public long create(String periodMonth, long createdByUserId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into payroll_runs(period_month, created_by_user_id) values (?, ?)", new String[] {"id"});
      ps.setString(1, periodMonth);
      ps.setLong(2, createdByUserId);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<PayrollRun> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where r.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  /** Raw calculated-by user id (not the display name) — used for the maker-checker check. */
  public Optional<Long> calculatedByUserId(long id) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("select calculated_by_user_id from payroll_runs where id = ?", Long.class, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public List<PayrollRun> findByStatus(String status) {
    return jdbc.query(SELECT + " where r.status = ? order by r.period_month", this::map, status);
  }

  public PageResponse<PayrollRun> search(String status, int page, int size) {
    String where = status == null || status.isBlank() ? "" : " where r.status = ? ";
    List<Object> args = status == null || status.isBlank() ? List.of() : List.of(status);
    List<Object> pagedArgs = new java.util.ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<PayrollRun> items = jdbc.query(SELECT + where + " order by r.period_month desc limit ? offset ? ", this::map, pagedArgs.toArray());
    long total = jdbc.queryForObject("select count(*) from payroll_runs r " + where, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  public void markCalculated(long id, long calculatedByUserId, BigDecimal totalGross, BigDecimal totalDeductions,
      BigDecimal totalNet, int employeeCount) {
    jdbc.update("""
        update payroll_runs set status = 'CALCULATED', calculated_by_user_id = ?, calculated_at = current_timestamp,
               total_gross = ?, total_deductions = ?, total_net = ?, employee_count = ?
        where id = ?
        """, calculatedByUserId, totalGross, totalDeductions, totalNet, employeeCount, id);
  }

  public void markStatus(long id, String status) {
    jdbc.update("update payroll_runs set status = ? where id = ?", status, id);
  }

  public void markApproved(long id, long approvedByUserId, String reason) {
    jdbc.update("update payroll_runs set status = 'APPROVED', approved_by_user_id = ?, approved_at = current_timestamp, approval_reason = ? where id = ?",
        approvedByUserId, reason, id);
  }

  public void markPublished(long id, long publishedByUserId) {
    jdbc.update("update payroll_runs set status = 'PUBLISHED', published_by_user_id = ?, published_at = current_timestamp where id = ?",
        publishedByUserId, id);
  }

  public void markPaid(long id) {
    jdbc.update("update payroll_runs set status = 'PAID', paid_at = current_timestamp where id = ?", id);
  }

  private PayrollRun map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp calculatedAt = rs.getTimestamp("calculated_at");
    Timestamp approvedAt = rs.getTimestamp("approved_at");
    Timestamp publishedAt = rs.getTimestamp("published_at");
    Timestamp paidAt = rs.getTimestamp("paid_at");
    return new PayrollRun(
        rs.getLong("id"), rs.getString("period_month"), rs.getString("status"),
        rs.getString("calculated_by_name"), calculatedAt == null ? null : calculatedAt.toLocalDateTime(),
        rs.getString("approved_by_name"), approvedAt == null ? null : approvedAt.toLocalDateTime(), rs.getString("approval_reason"),
        rs.getString("published_by_name"), publishedAt == null ? null : publishedAt.toLocalDateTime(),
        paidAt == null ? null : paidAt.toLocalDateTime(), rs.getBigDecimal("total_gross"), rs.getBigDecimal("total_deductions"),
        rs.getBigDecimal("total_net"), rs.getInt("employee_count"), rs.getString("created_by_name"),
        rs.getTimestamp("created_at").toLocalDateTime());
  }
}
