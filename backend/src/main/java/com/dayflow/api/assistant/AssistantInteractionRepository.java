package com.dayflow.api.assistant;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AssistantInteractionRepository {
  private static final String SELECT =
      "select id, employee_id, question, intent, answer, policy_id, action_taken, created_at from assistant_interactions";

  private final JdbcTemplate jdbc;

  public AssistantInteractionRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long employeeId, String question, String intent, String answer, Long policyId, String actionTaken) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into assistant_interactions(employee_id, question, intent, answer, policy_id, action_taken)
          values (?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, employeeId);
      ps.setString(2, question);
      ps.setString(3, intent);
      ps.setString(4, answer);
      if (policyId != null) {
        ps.setLong(5, policyId);
      } else {
        ps.setNull(5, Types.BIGINT);
      }
      ps.setString(6, actionTaken);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<AssistantInteraction> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public List<AssistantInteraction> history(long employeeId, int limit) {
    return jdbc.query(SELECT + " where employee_id = ? order by created_at desc limit ?", this::map, employeeId, limit);
  }

  private AssistantInteraction map(ResultSet rs, int rowNum) throws SQLException {
    Long policyId = (Long) rs.getObject("policy_id");
    return new AssistantInteraction(rs.getLong("id"), rs.getLong("employee_id"), rs.getString("question"),
        rs.getString("intent"), rs.getString("answer"), policyId, rs.getString("action_taken"),
        rs.getTimestamp("created_at").toLocalDateTime());
  }
}
