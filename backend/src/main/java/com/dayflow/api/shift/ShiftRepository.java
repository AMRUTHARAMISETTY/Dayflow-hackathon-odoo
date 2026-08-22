package com.dayflow.api.shift;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Time;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class ShiftRepository {
  private final JdbcTemplate jdbc;

  public ShiftRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Shift> findAll() {
    return jdbc.query("select id, name, start_time, end_time, grace_minutes, break_minutes from shifts order by start_time", this::map);
  }

  public Optional<Shift> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(
          "select id, name, start_time, end_time, grace_minutes, break_minutes from shifts where id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public Shift create(String name, java.time.LocalTime start, java.time.LocalTime end, int graceMinutes, int breakMinutes) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into shifts(name, start_time, end_time, grace_minutes, break_minutes) values (?, ?, ?, ?, ?)",
          new String[] {"id"});
      ps.setString(1, name);
      ps.setTime(2, Time.valueOf(start));
      ps.setTime(3, Time.valueOf(end));
      ps.setInt(4, graceMinutes);
      ps.setInt(5, breakMinutes);
      return ps;
    }, keys);
    return findById(keys.getKey().longValue()).orElseThrow();
  }

  public void assignToEmployee(long employeeId, Long shiftId) {
    jdbc.update("update employees set shift_id = ? where id = ?", shiftId, employeeId);
  }

  public Optional<Shift> findByEmployeeId(long employeeId) {
    try {
      return Optional.of(jdbc.queryForObject("""
          select s.id, s.name, s.start_time, s.end_time, s.grace_minutes, s.break_minutes
          from shifts s join employees e on e.shift_id = s.id
          where e.id = ?
          """, this::map, employeeId));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  private Shift map(ResultSet rs, int rowNum) throws SQLException {
    return new Shift(rs.getLong("id"), rs.getString("name"), rs.getTime("start_time").toLocalTime(),
        rs.getTime("end_time").toLocalTime(), rs.getInt("grace_minutes"), rs.getInt("break_minutes"));
  }
}
