package com.dayflow.api.payroll;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SalaryStructureRepository {
  private static final String SELECT = """
      select s.id, s.employee_id, e.name employee_name, s.effective_from, s.effective_to, s.basic_monthly,
             s.hra_monthly, s.allowances_monthly, s.recurring_deductions_monthly,
             (s.basic_monthly + s.hra_monthly + s.allowances_monthly) gross_monthly,
             s.status, s.reason, coalesce(ce.name, 'System') created_by_name, s.created_at
      from salary_structures s
      join employees e on e.id = s.employee_id
      left join users u on u.id = s.created_by_user_id
      left join employees ce on ce.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public SalaryStructureRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<SalaryStructure> historyForEmployee(long employeeId) {
    return jdbc.query(SELECT + " where s.employee_id = ? order by s.effective_from desc", this::map, employeeId);
  }

  public Optional<SalaryStructure> currentAsOf(long employeeId, LocalDate asOfDate) {
    try {
      return Optional.of(jdbc.queryForObject(
          SELECT + " where s.employee_id = ? and s.status = 'ACTIVE' and s.effective_from <= ? order by s.effective_from desc limit 1",
          this::map, employeeId, asOfDate));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public Optional<SalaryStructure> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where s.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public long create(long employeeId, LocalDate effectiveFrom, BigDecimal basic, BigDecimal hra, BigDecimal allowances,
      BigDecimal recurringDeductions, String reason, long createdByUserId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into salary_structures(employee_id, effective_from, basic_monthly, hra_monthly, allowances_monthly,
                                         recurring_deductions_monthly, reason, created_by_user_id)
          values (?, ?, ?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setObject(2, effectiveFrom);
      ps.setBigDecimal(3, basic);
      ps.setBigDecimal(4, hra);
      ps.setBigDecimal(5, allowances);
      ps.setBigDecimal(6, recurringDeductions);
      ps.setString(7, reason);
      ps.setLong(8, createdByUserId);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void supersede(long employeeId, LocalDate beforeDate) {
    jdbc.update("update salary_structures set status = 'SUPERSEDED', effective_to = ? where employee_id = ? and status = 'ACTIVE'",
        beforeDate.minusDays(1), employeeId);
  }

  private SalaryStructure map(ResultSet rs, int rowNum) throws SQLException {
    var effectiveTo = rs.getDate("effective_to");
    return new SalaryStructure(
        rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_name"),
        rs.getDate("effective_from").toLocalDate(), effectiveTo == null ? null : effectiveTo.toLocalDate(),
        rs.getBigDecimal("basic_monthly"), rs.getBigDecimal("hra_monthly"), rs.getBigDecimal("allowances_monthly"),
        rs.getBigDecimal("recurring_deductions_monthly"), rs.getBigDecimal("gross_monthly"), rs.getString("status"),
        rs.getString("reason"), rs.getString("created_by_name"), rs.getTimestamp("created_at").toLocalDateTime());
  }
}
