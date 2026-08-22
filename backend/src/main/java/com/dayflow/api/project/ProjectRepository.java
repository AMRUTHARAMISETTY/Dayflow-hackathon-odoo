package com.dayflow.api.project;

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
public class ProjectRepository {
  private final JdbcTemplate jdbc;

  public ProjectRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public PageResponse<Project> search(String q, String status, Long ownerEmployeeId, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (q != null && !q.isBlank()) {
      where.append(" and (lower(p.name) like ? or lower(p.code) like ? or lower(coalesce(p.business_outcome,'')) like ?) ");
      String like = "%" + q.toLowerCase() + "%";
      args.add(like);
      args.add(like);
      args.add(like);
    }
    if (status != null && !status.isBlank()) {
      where.append(" and p.status = ? ");
      args.add(status);
    }
    if (ownerEmployeeId != null) {
      where.append(" and p.owner_employee_id = ? ");
      args.add(ownerEmployeeId);
    }
    List<Object> paged = new ArrayList<>(args);
    paged.add(size);
    paged.add(page * size);
    List<Project> items = jdbc.query(select() + where + " order by p.created_at desc limit ? offset ? ", this::map, paged.toArray());
    long total = jdbc.queryForObject("select count(*) from projects p " + where, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  public Optional<Project> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(select() + " where p.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public Project requireById(long id) {
    return findById(id).orElseThrow(() -> ApiException.notFound("Project not found."));
  }

  public boolean existsByCode(String code) {
    Integer count = jdbc.queryForObject("select count(*) from projects where lower(code) = lower(?)", Integer.class, code);
    return count != null && count > 0;
  }

  public long create(CreateProjectRequest request) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into projects(name, code, description, business_outcome, status, priority, sponsor_employee_id,
            owner_employee_id, start_date, target_date, budget_amount)
          values(?,?,?,?,?,?,?,?,?,?,?)
          """, new String[] {"id"});
      ps.setString(1, request.name());
      ps.setString(2, request.code());
      ps.setString(3, request.description());
      ps.setString(4, request.businessOutcome());
      ps.setString(5, request.status() == null || request.status().isBlank() ? "Planning" : request.status());
      ps.setString(6, request.priority() == null || request.priority().isBlank() ? "Medium" : request.priority());
      ps.setLong(7, request.sponsorEmployeeId());
      ps.setLong(8, request.ownerEmployeeId());
      ps.setObject(9, request.startDate());
      ps.setObject(10, request.targetDate());
      ps.setBigDecimal(11, request.budgetAmount());
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void addTeam(long projectId, long teamId) {
    jdbc.update("insert into project_teams(project_id, team_id) values(?, ?)", projectId, teamId);
  }

  public long addMilestone(long projectId, CreateMilestoneRequest request) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into project_milestones(project_id, name, status, due_date, completion_percent)
          values(?,?,?,?,?)
          """, new String[] {"id"});
      ps.setLong(1, projectId);
      ps.setString(2, request.name());
      ps.setString(3, request.status() == null || request.status().isBlank() ? "Not Started" : request.status());
      ps.setObject(4, request.dueDate());
      ps.setBigDecimal(5, request.completionPercent());
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public List<ProjectMilestone> milestones(long projectId) {
    return jdbc.query("""
        select id, project_id, name, status, due_date, completion_percent, created_at
        from project_milestones where project_id = ? order by due_date nulls last, created_at
        """, this::mapMilestone, projectId);
  }

  private String select() {
    return """
        select p.*, sponsor.name sponsor_name, owner.name owner_name,
          (select count(*) from project_teams pt where pt.project_id = p.id) team_count,
          (select count(*) from tasks t where t.project_id = p.id) task_count,
          (select count(*) from tasks t where t.project_id = p.id and t.status <> 'Completed') open_task_count
        from projects p
        join employees sponsor on sponsor.id = p.sponsor_employee_id
        join employees owner on owner.id = p.owner_employee_id
        """;
  }

  private Project map(ResultSet rs, int row) throws SQLException {
    return new Project(rs.getLong("id"), rs.getString("name"), rs.getString("code"), rs.getString("description"),
        rs.getString("business_outcome"), rs.getString("status"), rs.getString("priority"),
        rs.getLong("sponsor_employee_id"), rs.getString("sponsor_name"), rs.getLong("owner_employee_id"),
        rs.getString("owner_name"), rs.getObject("start_date", java.time.LocalDate.class),
        rs.getObject("target_date", java.time.LocalDate.class), rs.getBigDecimal("budget_amount"),
        rs.getBigDecimal("completion_percent"), rs.getInt("team_count"), rs.getInt("task_count"),
        rs.getInt("open_task_count"), rs.getTimestamp("created_at").toLocalDateTime());
  }

  private ProjectMilestone mapMilestone(ResultSet rs, int row) throws SQLException {
    return new ProjectMilestone(rs.getLong("id"), rs.getLong("project_id"), rs.getString("name"),
        rs.getString("status"), rs.getObject("due_date", java.time.LocalDate.class),
        rs.getBigDecimal("completion_percent"), rs.getTimestamp("created_at").toLocalDateTime());
  }
}
