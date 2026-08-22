package com.dayflow.api.calendar;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class HolidayRepository {
  private final JdbcTemplate jdbc;

  public HolidayRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Holiday> findBetween(LocalDate from, LocalDate to) {
    return jdbc.query(
        "select id, holiday_date, name, location from holidays where holiday_date between ? and ? order by holiday_date",
        this::map, from, to);
  }

  public List<Holiday> findAll() {
    return jdbc.query("select id, holiday_date, name, location from holidays order by holiday_date", this::map);
  }

  public Holiday create(LocalDate date, String name, String location) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("insert into holidays(holiday_date, name, location) values (?, ?, ?)", new String[] {"id"});
      ps.setDate(1, java.sql.Date.valueOf(date));
      ps.setString(2, name);
      ps.setString(3, location);
      return ps;
    }, keys);
    long id = keys.getKey().longValue();
    return jdbc.queryForObject("select id, holiday_date, name, location from holidays where id = ?", this::map, id);
  }

  private Holiday map(ResultSet rs, int rowNum) throws SQLException {
    return new Holiday(rs.getLong("id"), rs.getDate("holiday_date").toLocalDate(), rs.getString("name"), rs.getString("location"));
  }
}
