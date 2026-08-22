package com.dayflow.api.performance;

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
public class PerformanceReviewRepository {
  private static final String SELECT = """
      select r.id, r.employee_id, e.name employee_name, r.reviewer_user_id, coalesce(re.name, 'Unknown') reviewer_name,
             r.cycle, r.rating, r.strengths, r.improvements, r.manager_comments, r.status,
             r.submitted_at, r.acknowledged_at, r.created_at, r.updated_at
      from performance_reviews r
      join employees e on e.id = r.employee_id
      left join users ru on ru.id = r.reviewer_user_id
      left join employees re on re.id = ru.employee_id
      """;

  private final JdbcTemplate jdbc;

  public PerformanceReviewRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long employeeId, long reviewerUserId, String cycle) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into performance_reviews(employee_id, reviewer_user_id, cycle) values (?, ?, ?)", new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setLong(2, reviewerUserId);
      ps.setString(3, cycle);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<PerformanceReview> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where r.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public List<PerformanceReview> forEmployee(long employeeId) {
    return jdbc.query(SELECT + " where r.employee_id = ? order by r.created_at desc", this::map, employeeId);
  }

  public void submit(long id, int rating, String strengths, String improvements, String managerComments) {
    jdbc.update("""
        update performance_reviews set rating = ?, strengths = ?, improvements = ?, manager_comments = ?,
               status = 'SUBMITTED', submitted_at = current_timestamp, updated_at = current_timestamp
        where id = ?
        """, rating, strengths, improvements, managerComments, id);
  }

  public void acknowledge(long id) {
    jdbc.update("update performance_reviews set status = 'ACKNOWLEDGED', acknowledged_at = current_timestamp, updated_at = current_timestamp where id = ?", id);
  }

  private PerformanceReview map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp submittedAt = rs.getTimestamp("submitted_at");
    Timestamp acknowledgedAt = rs.getTimestamp("acknowledged_at");
    return new PerformanceReview(rs.getLong("id"), rs.getLong("employee_id"), rs.getString("employee_name"),
        rs.getLong("reviewer_user_id"), rs.getString("reviewer_name"), rs.getString("cycle"),
        (Integer) rs.getObject("rating"), rs.getString("strengths"), rs.getString("improvements"),
        rs.getString("manager_comments"), rs.getString("status"), submittedAt == null ? null : submittedAt.toLocalDateTime(),
        acknowledgedAt == null ? null : acknowledgedAt.toLocalDateTime(), rs.getTimestamp("created_at").toLocalDateTime(),
        rs.getTimestamp("updated_at").toLocalDateTime());
  }
}
