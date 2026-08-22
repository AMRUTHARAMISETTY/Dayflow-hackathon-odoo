package com.dayflow.api.performance;

import java.sql.Date;
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
public class GoalRepository {
  private static final String SELECT = """
      select g.id, g.employee_id, e.name employee_name, g.title, g.description, g.category, g.due_date,
             g.status, g.progress_percent, coalesce(ce.name, 'System') created_by_name, g.created_at, g.updated_at
      from goals g
      join employees e on e.id = g.employee_id
      left join users cu on cu.id = g.created_by_user_id
      left join employees ce on ce.id = cu.employee_id
      """;

  private final JdbcTemplate jdbc;

  public GoalRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long employeeId, String title, String description, String category, LocalDate dueDate, long createdByUserId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into goals(employee_id, title, description, category, due_date, created_by_user_id)
          values (?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setString(2, title);
      ps.setString(3, description);
      ps.setString(4, category);
      if (dueDate != null) ps.setDate(5, Date.valueOf(dueDate)); else ps.setNull(5, java.sql.Types.DATE);
      ps.setLong(6, createdByUserId);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<Goal> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where g.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public List<Goal> forEmployee(long employeeId) {
    return jdbc.query(SELECT + " where g.employee_id = ? order by g.due_date is null, g.due_date, g.created_at desc", this::map, employeeId);
  }

  public void updateProgress(long id, int progressPercent, String status) {
    jdbc.update("update goals set progress_percent = ?, status = ?, updated_at = current_timestamp where id = ?",
        progressPercent, status, id);
  }

  private Goal map(ResultSet rs, int rowNum) throws SQLException {
    Date dueDate = rs.getDate("due_date");
    return new Goal(rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_name"), rs.getString("title"),
        rs.getString("description"), rs.getString("category"), dueDate == null ? null : dueDate.toLocalDate(),
        rs.getString("status"), rs.getInt("progress_percent"), rs.getString("created_by_name"),
        rs.getTimestamp("created_at").toLocalDateTime(), rs.getTimestamp("updated_at").toLocalDateTime());
  }
}
