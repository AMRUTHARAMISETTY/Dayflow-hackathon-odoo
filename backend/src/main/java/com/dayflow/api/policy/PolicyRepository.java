package com.dayflow.api.policy;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class PolicyRepository {
  private static final String SELECT =
      "select id, code, title, category, body, effective_date, active, created_at from policies";

  private final JdbcTemplate jdbc;

  public PolicyRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Policy> findAll(boolean activeOnly) {
    String where = activeOnly ? " where active = true " : "";
    return jdbc.query(SELECT + where + " order by category, title", this::map);
  }

  public Optional<Policy> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public Optional<Policy> findByCode(String code) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where code = ?", this::map, code));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public List<Policy> search(String category, String keyword) {
    List<Object> args = new java.util.ArrayList<>();
    StringBuilder where = new StringBuilder(" where active = true ");
    if (category != null && !category.isBlank()) {
      where.append(" and category = ? ");
      args.add(category);
    }
    if (keyword != null && !keyword.isBlank()) {
      where.append(" and (lower(title) like ? or lower(body) like ?) ");
      String pattern = "%" + keyword.toLowerCase(java.util.Locale.ROOT) + "%";
      args.add(pattern);
      args.add(pattern);
    }
    return jdbc.query(SELECT + where + " order by category, title", this::map, args.toArray());
  }

  public long create(String code, String title, String category, String body, java.time.LocalDate effectiveDate) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into policies(code, title, category, body, effective_date) values (?, ?, ?, ?, ?)", new String[] {"id"});
      ps.setString(1, code);
      ps.setString(2, title);
      ps.setString(3, category);
      ps.setString(4, body);
      ps.setDate(5, java.sql.Date.valueOf(effectiveDate));
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void update(long id, String title, String category, String body, java.time.LocalDate effectiveDate) {
    jdbc.update("update policies set title = ?, category = ?, body = ?, effective_date = ? where id = ?",
        title, category, body, java.sql.Date.valueOf(effectiveDate), id);
  }

  public void setActive(long id, boolean active) {
    jdbc.update("update policies set active = ? where id = ?", active, id);
  }

  public boolean existsByCode(String code) {
    Integer count = jdbc.queryForObject("select count(*) from policies where code = ?", Integer.class, code);
    return count != null && count > 0;
  }

  private Policy map(ResultSet rs, int rowNum) throws SQLException {
    return new Policy(rs.getLong("id"), rs.getString("code"), rs.getString("title"), rs.getString("category"),
        rs.getString("body"), rs.getDate("effective_date").toLocalDate(), rs.getBoolean("active"),
        rs.getTimestamp("created_at").toLocalDateTime());
  }
}
