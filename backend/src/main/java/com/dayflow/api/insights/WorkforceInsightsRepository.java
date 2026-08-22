package com.dayflow.api.insights;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.AbstractMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WorkforceInsightsRepository {
  public record EmployeeSnapshot(long id, String name, String departmentName, Long managerId, LocalDate joiningDate) {
  }

  private final JdbcTemplate jdbc;

  public WorkforceInsightsRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  /** Non-archived employees only — headcount trend reflects the current roster's join history,
   * not a full historical reconstruction (this codebase doesn't track an exit date). */
  public List<LocalDate> joiningDatesForHeadcount() {
    return jdbc.query("select joining_date from employees where status <> 'Archived' and joining_date is not null",
        (rs, rowNum) -> rs.getDate("joining_date").toLocalDate());
  }

  public List<EmployeeSnapshot> activeEmployeeSnapshots() {
    return jdbc.query("""
        select e.id, e.name, d.name department_name, e.manager_id, e.joining_date
        from employees e left join departments d on d.id = e.department_id
        where e.status = 'Active'
        """, (rs, rowNum) -> new EmployeeSnapshot(rs.getLong("id"), rs.getString("name"), rs.getString("department_name"),
            (Long) rs.getObject("manager_id"), rs.getDate("joining_date") == null ? null : rs.getDate("joining_date").toLocalDate()));
  }

  public Map<Long, Integer> lateCountSince(LocalDate since) {
    List<Map.Entry<Long, Integer>> rows = jdbc.query(
        "select employee_id, count(*) c from attendance_records where work_date >= ? and late_minutes > 0 group by employee_id",
        (rs, rowNum) -> new AbstractMap.SimpleEntry<>(rs.getLong("employee_id"), rs.getInt("c")), Date.valueOf(since));
    return rows.stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }

  public Map<Long, BigDecimal> leaveDaysSince(LocalDate since) {
    List<Map.Entry<Long, BigDecimal>> rows = jdbc.query(
        "select employee_id, coalesce(sum(days),0) d from leave_requests where status = 'APPROVED' and start_date >= ? group by employee_id",
        (rs, rowNum) -> new AbstractMap.SimpleEntry<>(rs.getLong("employee_id"), rs.getBigDecimal("d")), Date.valueOf(since));
    return rows.stream().collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
  }
}
