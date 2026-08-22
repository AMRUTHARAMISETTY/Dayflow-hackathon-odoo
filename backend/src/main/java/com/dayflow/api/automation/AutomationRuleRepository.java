package com.dayflow.api.automation;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AutomationRuleRepository {
  private static final String SELECT = """
      select r.id, r.code, r.name, r.description, r.trigger_type, r.config, r.active, r.test_mode, r.high_risk,
             coalesce(oe.name, null) owner_name, r.last_run_at, r.last_run_status, r.run_count, r.success_count,
             case when r.run_count = 0 then 100.0 else (r.success_count * 100.0 / r.run_count) end success_rate,
             r.created_at, r.updated_at
      from automation_rules r
      left join users u on u.id = r.owner_user_id
      left join employees oe on oe.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public AutomationRuleRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<AutomationRule> findAll() {
    return jdbc.query(SELECT + " order by r.name", this::map);
  }

  public Optional<AutomationRule> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where r.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public List<AutomationRule> findActiveByTrigger(String triggerType) {
    return jdbc.query(SELECT + " where r.active = true and r.trigger_type = ?", this::map, triggerType);
  }

  public void setActive(long id, boolean active) {
    jdbc.update("update automation_rules set active = ?, updated_at = current_timestamp where id = ?", active, id);
  }

  public void setTestMode(long id, boolean testMode) {
    jdbc.update("update automation_rules set test_mode = ?, updated_at = current_timestamp where id = ?", testMode, id);
  }

  public void updateConfig(long id, String config) {
    jdbc.update("update automation_rules set config = ?, updated_at = current_timestamp where id = ?", config, id);
  }

  public void recordRun(long id, boolean success, boolean countsTowardStats) {
    if (countsTowardStats) {
      jdbc.update("""
          update automation_rules
          set last_run_at = current_timestamp, last_run_status = ?, run_count = run_count + 1,
              success_count = success_count + ?, updated_at = current_timestamp
          where id = ?
          """, success ? "SUCCESS" : "FAILURE", success ? 1 : 0, id);
    } else {
      jdbc.update("update automation_rules set last_run_status = ? where id = ?", success ? "DRY_RUN" : "DRY_RUN_FAILED", id);
    }
  }

  private AutomationRule map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp lastRun = rs.getTimestamp("last_run_at");
    return new AutomationRule(
        rs.getLong("id"), rs.getString("code"), rs.getString("name"), rs.getString("description"),
        rs.getString("trigger_type"), rs.getString("config"), rs.getBoolean("active"), rs.getBoolean("test_mode"),
        rs.getBoolean("high_risk"), rs.getString("owner_name"), lastRun == null ? null : lastRun.toLocalDateTime(),
        rs.getString("last_run_status"), rs.getInt("run_count"), rs.getInt("success_count"), rs.getDouble("success_rate"),
        rs.getTimestamp("created_at").toLocalDateTime(), rs.getTimestamp("updated_at").toLocalDateTime());
  }
}
