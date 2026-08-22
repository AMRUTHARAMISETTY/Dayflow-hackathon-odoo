package com.dayflow.api.automation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class AutomationExecutionRepository {
  private final JdbcTemplate jdbc;

  public AutomationExecutionRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long ruleId, LocalDateTime startedAt, LocalDateTime finishedAt, String status, int matchedCount,
      int actionCount, String detail, String errorMessage) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into automation_executions(rule_id, started_at, finished_at, status, matched_count, action_count, detail, error_message)
          values (?, ?, ?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, ruleId);
      ps.setTimestamp(2, Timestamp.valueOf(startedAt));
      ps.setTimestamp(3, finishedAt == null ? null : Timestamp.valueOf(finishedAt));
      ps.setString(4, status);
      ps.setInt(5, matchedCount);
      ps.setInt(6, actionCount);
      ps.setString(7, detail);
      ps.setString(8, errorMessage);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public List<AutomationExecution> forRule(long ruleId, int limit) {
    return jdbc.query("""
        select id, rule_id, started_at, finished_at, status, matched_count, action_count, detail, error_message
        from automation_executions where rule_id = ? order by started_at desc limit ?
        """, this::map, ruleId, limit);
  }

  private AutomationExecution map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp finished = rs.getTimestamp("finished_at");
    return new AutomationExecution(rs.getLong("id"), rs.getLong("rule_id"), rs.getTimestamp("started_at").toLocalDateTime(),
        finished == null ? null : finished.toLocalDateTime(), rs.getString("status"), rs.getInt("matched_count"),
        rs.getInt("action_count"), rs.getString("detail"), rs.getString("error_message"));
  }
}
