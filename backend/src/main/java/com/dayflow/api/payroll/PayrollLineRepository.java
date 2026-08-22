package com.dayflow.api.payroll;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PayrollLineRepository {
  private static final String SELECT = """
      select l.id, l.payroll_run_id, l.employee_id, e.name employee_name, d.name department_name, l.basic, l.hra,
             l.allowances, l.overtime_pay, l.gross_earnings, l.unpaid_leave_days, l.unpaid_leave_deduction,
             l.tax_deduction, l.other_deductions, l.total_deductions, l.net_pay
      from payroll_lines l
      join employees e on e.id = l.employee_id
      left join departments d on d.id = e.department_id
      """;

  private final JdbcTemplate jdbc;

  public PayrollLineRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void deleteForRun(long payrollRunId) {
    jdbc.update("delete from payroll_lines where payroll_run_id = ?", payrollRunId);
  }

  public void insert(long payrollRunId, long employeeId, Long salaryStructureId, BigDecimal basic, BigDecimal hra,
      BigDecimal allowances, BigDecimal overtimePay, BigDecimal grossEarnings, BigDecimal unpaidLeaveDays,
      BigDecimal unpaidLeaveDeduction, BigDecimal taxDeduction, BigDecimal otherDeductions, BigDecimal totalDeductions,
      BigDecimal netPay) {
    jdbc.update("""
        insert into payroll_lines(payroll_run_id, employee_id, salary_structure_id, basic, hra, allowances,
                                   overtime_pay, gross_earnings, unpaid_leave_days, unpaid_leave_deduction,
                                   tax_deduction, other_deductions, total_deductions, net_pay)
        values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, payrollRunId, employeeId, salaryStructureId, basic, hra, allowances, overtimePay, grossEarnings,
        unpaidLeaveDays, unpaidLeaveDeduction, taxDeduction, otherDeductions, totalDeductions, netPay);
  }

  public List<PayrollLine> forRun(long payrollRunId) {
    return jdbc.query(SELECT + " where l.payroll_run_id = ? order by e.name", this::map, payrollRunId);
  }

  /** Scoped to PUBLISHED/PAID runs only — a salary slip only exists once payroll is issued. */
  public List<PayrollLine> publishedSlipsForEmployee(long employeeId) {
    return jdbc.query(SELECT + """
         join payroll_runs r on r.id = l.payroll_run_id
         where l.employee_id = ? and r.status in ('PUBLISHED', 'PAID')
         order by r.period_month desc
        """, this::map, employeeId);
  }

  public Optional<PayrollLine> findForEmployeeInRun(long payrollRunId, long employeeId) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where l.payroll_run_id = ? and l.employee_id = ?", this::map, payrollRunId, employeeId));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  private PayrollLine map(ResultSet rs, int rowNum) throws SQLException {
    return new PayrollLine(
        rs.getLong("id"), rs.getLong("payroll_run_id"), rs.getLong("employee_id"), rs.getString("employee_name"),
        rs.getString("department_name"), rs.getBigDecimal("basic"), rs.getBigDecimal("hra"), rs.getBigDecimal("allowances"),
        rs.getBigDecimal("overtime_pay"), rs.getBigDecimal("gross_earnings"), rs.getBigDecimal("unpaid_leave_days"),
        rs.getBigDecimal("unpaid_leave_deduction"), rs.getBigDecimal("tax_deduction"), rs.getBigDecimal("other_deductions"),
        rs.getBigDecimal("total_deductions"), rs.getBigDecimal("net_pay"));
  }
}
