package com.dayflow.api.workload;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class WorkloadRepository {
  private final JdbcTemplate jdbc;

  public WorkloadRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<WorkloadRow> teamWorkload(Long teamId, LocalDate from, LocalDate to) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where tm.active = true ");
    args.add(to);
    args.add(from);
    if (teamId != null) {
      where.append(" and tm.team_id = ? ");
      args.add(teamId);
    }
    return jdbc.query("""
        select e.id employee_id, e.name employee_name, d.name department_name, e.designation,
          team.id team_id, team.name team_name, tm.allocation_percent,
          (team.capacity_hours_per_week * tm.allocation_percent / 100) weekly_capacity_hours,
          coalesce(sum(case when task.status <> 'Completed' then coalesce(task.estimated_hours, 0) * ta.allocation_percent / 100 else 0 end), 0) assigned_open_hours,
          coalesce((select sum(l.days) from leave_requests l
            where l.employee_id = e.id and l.status = 'APPROVED' and l.start_date <= ? and l.end_date >= ?), 0) approved_leave_days
        from team_memberships tm
        join teams team on team.id = tm.team_id
        join employees e on e.id = tm.employee_id
        left join departments d on d.id = e.department_id
        left join task_assignees ta on ta.employee_id = e.id
        left join tasks task on task.id = ta.task_id and task.team_id = team.id
        """ + where + """
        group by e.id, e.name, d.name, e.designation, team.id, team.name, team.capacity_hours_per_week, tm.allocation_percent
        order by team.name, e.name
        """, this::map, args.toArray());
  }

  private WorkloadRow map(ResultSet rs, int row) throws SQLException {
    BigDecimal capacity = scaled(rs.getBigDecimal("weekly_capacity_hours"));
    BigDecimal assigned = scaled(rs.getBigDecimal("assigned_open_hours"));
    BigDecimal leaveDays = scaled(rs.getBigDecimal("approved_leave_days"));
    BigDecimal leaveHours = leaveDays == null ? BigDecimal.ZERO : leaveDays.multiply(new BigDecimal("8.00"));
    BigDecimal remaining = scaled(capacity.subtract(assigned).subtract(leaveHours));
    BigDecimal utilization = capacity.compareTo(BigDecimal.ZERO) == 0
        ? BigDecimal.ZERO
        : assigned.add(leaveHours).multiply(new BigDecimal("100")).divide(capacity, 2, java.math.RoundingMode.HALF_UP);
    String risk = utilization.compareTo(new BigDecimal("100")) >= 0 ? "Overloaded"
        : utilization.compareTo(new BigDecimal("85")) >= 0 ? "At Risk"
        : utilization.compareTo(new BigDecimal("50")) >= 0 ? "Healthy" : "Available";
    return new WorkloadRow(rs.getLong("employee_id"), rs.getString("employee_name"), rs.getString("department_name"),
        rs.getString("designation"), rs.getLong("team_id"), rs.getString("team_name"),
        rs.getBigDecimal("allocation_percent"), capacity, assigned, leaveDays, remaining, risk);
  }

  private BigDecimal scaled(BigDecimal value) {
    return (value == null ? BigDecimal.ZERO : value).setScale(2, java.math.RoundingMode.HALF_UP);
  }
}
