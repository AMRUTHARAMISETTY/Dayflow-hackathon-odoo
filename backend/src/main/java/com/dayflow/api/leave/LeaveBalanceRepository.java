package com.dayflow.api.leave;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LeaveBalanceRepository {
  private final JdbcTemplate jdbc;

  public LeaveBalanceRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<LeaveBalance> forEmployee(long employeeId) {
    return jdbc.query("""
        select lt.id leave_type_id, lt.name leave_type_name, coalesce(lb.balance, 0) balance
        from leave_types lt
        left join leave_balances lb on lb.leave_type_id = lt.id and lb.employee_id = ?
        where lt.active = true
        order by lt.name
        """, (rs, rowNum) -> map(employeeId, rs), employeeId);
  }

  public Optional<BigDecimal> findBalance(long employeeId, long leaveTypeId) {
    try {
      return Optional.of(jdbc.queryForObject(
          "select balance from leave_balances where employee_id = ? and leave_type_id = ?", BigDecimal.class, employeeId, leaveTypeId));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public void adjustBalance(long employeeId, long leaveTypeId, BigDecimal delta) {
    int updated = jdbc.update(
        "update leave_balances set balance = balance + ?, updated_at = current_timestamp where employee_id = ? and leave_type_id = ?",
        delta, employeeId, leaveTypeId);
    if (updated == 0) {
      jdbc.update("insert into leave_balances(employee_id, leave_type_id, balance) values (?, ?, ?)", employeeId, leaveTypeId, delta);
    }
  }

  public void setBalance(long employeeId, long leaveTypeId, BigDecimal balance) {
    int updated = jdbc.update("update leave_balances set balance = ?, updated_at = current_timestamp where employee_id = ? and leave_type_id = ?",
        balance, employeeId, leaveTypeId);
    if (updated == 0) {
      jdbc.update("insert into leave_balances(employee_id, leave_type_id, balance) values (?, ?, ?)", employeeId, leaveTypeId, balance);
    }
  }

  private LeaveBalance map(long employeeId, ResultSet rs) throws SQLException {
    return new LeaveBalance(employeeId, rs.getLong("leave_type_id"), rs.getString("leave_type_name"), rs.getBigDecimal("balance"));
  }
}
