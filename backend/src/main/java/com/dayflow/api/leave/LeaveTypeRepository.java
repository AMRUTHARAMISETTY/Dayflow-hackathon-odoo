package com.dayflow.api.leave;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LeaveTypeRepository {
  private static final String SELECT = "select id, name, description, requires_approval, max_consecutive_days, paid, active from leave_types";
  private final JdbcTemplate jdbc;

  public LeaveTypeRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<LeaveType> findAllActive() {
    return jdbc.query(SELECT + " where active = true order by name", this::map);
  }

  public Optional<LeaveType> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  private LeaveType map(ResultSet rs, int rowNum) throws SQLException {
    return new LeaveType(rs.getLong("id"), rs.getString("name"), rs.getString("description"),
        rs.getBoolean("requires_approval"), (Integer) rs.getObject("max_consecutive_days"),
        rs.getBoolean("paid"), rs.getBoolean("active"));
  }
}
