package com.dayflow.api.task;

import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class TaskRepository {
  private final JdbcTemplate jdbc;

  public TaskRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public PageResponse<TaskItem> search(Long projectId, Long teamId, Long assigneeEmployeeId, String status, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (projectId != null) {
      where.append(" and t.project_id = ? ");
      args.add(projectId);
    }
    if (teamId != null) {
      where.append(" and t.team_id = ? ");
      args.add(teamId);
    }
    if (assigneeEmployeeId != null) {
      where.append(" and exists(select 1 from task_assignees ta where ta.task_id = t.id and ta.employee_id = ?) ");
      args.add(assigneeEmployeeId);
    }
    if (status != null && !status.isBlank()) {
      where.append(" and t.status = ? ");
      args.add(status);
    }
    List<Object> paged = new ArrayList<>(args);
    paged.add(size);
    paged.add(page * size);
    List<TaskItem> items = jdbc.query(select() + where + " order by t.due_date nulls last, t.priority, t.created_at desc limit ? offset ? ",
        this::map, paged.toArray());
    long total = jdbc.queryForObject("select count(*) from tasks t " + where, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  public Optional<TaskItem> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(select() + " where t.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public TaskItem requireById(long id) {
    return findById(id).orElseThrow(() -> ApiException.notFound("Task not found."));
  }

  public long create(CreateTaskRequest request, long defaultReporterEmployeeId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into tasks(project_id, team_id, title, description, type, status, priority, reporter_employee_id,
            reviewer_employee_id, due_date, estimated_hours, automation_hint)
          values(?,?,?,?,?,?,?,?,?,?,?,?)
          """, new String[] {"id"});
      ps.setLong(1, request.projectId());
      setLong(ps, 2, request.teamId());
      ps.setString(3, request.title());
      ps.setString(4, request.description());
      ps.setString(5, request.type() == null || request.type().isBlank() ? "Task" : request.type());
      ps.setString(6, request.status() == null || request.status().isBlank() ? "To Do" : request.status());
      ps.setString(7, request.priority() == null || request.priority().isBlank() ? "Medium" : request.priority());
      ps.setLong(8, request.reporterEmployeeId() == null ? defaultReporterEmployeeId : request.reporterEmployeeId());
      setLong(ps, 9, request.reviewerEmployeeId());
      ps.setObject(10, request.dueDate());
      ps.setBigDecimal(11, request.estimatedHours());
      ps.setString(12, request.automationHint());
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void assign(long taskId, long employeeId, String role, java.math.BigDecimal allocationPercent) {
    jdbc.update("""
        insert into task_assignees(task_id, employee_id, role, allocation_percent)
        values(?,?,?,?)
        """, taskId, employeeId, role == null || role.isBlank() ? "Owner" : role,
        allocationPercent == null ? new java.math.BigDecimal("100.00") : allocationPercent);
  }

  public void updateStatus(long taskId, String status, java.math.BigDecimal actualHours) {
    jdbc.update("update tasks set status = ?, actual_hours = coalesce(?, actual_hours), updated_at = current_timestamp where id = ?",
        status, actualHours, taskId);
  }

  public List<TaskAssignee> assignees(long taskId) {
    return jdbc.query("""
        select ta.*, e.name employee_name
        from task_assignees ta join employees e on e.id = ta.employee_id
        where ta.task_id = ? order by ta.assigned_at
        """, this::mapAssignee, taskId);
  }

  private String select() {
    return """
        select t.*, p.name project_name, team.name team_name, reporter.name reporter_name, reviewer.name reviewer_name,
          (select count(*) from task_assignees ta where ta.task_id = t.id) assignee_count
        from tasks t
        join projects p on p.id = t.project_id
        left join teams team on team.id = t.team_id
        left join employees reporter on reporter.id = t.reporter_employee_id
        left join employees reviewer on reviewer.id = t.reviewer_employee_id
        """;
  }

  private TaskItem map(ResultSet rs, int row) throws SQLException {
    return new TaskItem(rs.getLong("id"), rs.getLong("project_id"), rs.getString("project_name"),
        nullableLong(rs, "team_id"), rs.getString("team_name"), rs.getString("title"), rs.getString("description"),
        rs.getString("type"), rs.getString("status"), rs.getString("priority"),
        nullableLong(rs, "reporter_employee_id"), rs.getString("reporter_name"),
        nullableLong(rs, "reviewer_employee_id"), rs.getString("reviewer_name"),
        rs.getObject("due_date", java.time.LocalDate.class), rs.getBigDecimal("estimated_hours"),
        rs.getBigDecimal("actual_hours"), rs.getString("automation_hint"), rs.getInt("assignee_count"),
        rs.getTimestamp("created_at").toLocalDateTime(), rs.getTimestamp("updated_at").toLocalDateTime());
  }

  private TaskAssignee mapAssignee(ResultSet rs, int row) throws SQLException {
    return new TaskAssignee(rs.getLong("id"), rs.getLong("task_id"), rs.getLong("employee_id"),
        rs.getString("employee_name"), rs.getString("role"), rs.getBigDecimal("allocation_percent"),
        rs.getTimestamp("assigned_at").toLocalDateTime());
  }

  private Long nullableLong(ResultSet rs, String column) throws SQLException {
    long value = rs.getLong(column);
    return rs.wasNull() ? null : value;
  }

  private void setLong(java.sql.PreparedStatement ps, int index, Long value) throws SQLException {
    if (value == null) ps.setNull(index, java.sql.Types.BIGINT);
    else ps.setLong(index, value);
  }
}
