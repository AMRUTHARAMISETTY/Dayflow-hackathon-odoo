package com.dayflow.api.department;

import com.dayflow.api.common.ApiException;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class DepartmentRepository {
  private final JdbcTemplate jdbc;

  public DepartmentRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Department> findAll() {
    return jdbc.query("select id, name, location from departments order by name", this::map);
  }

  public Optional<Department> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject("select id, name, location from departments where id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public Department create(String name, String location) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("insert into departments(name, location) values (?, ?)", new String[] {"id"});
      ps.setString(1, name);
      ps.setString(2, location);
      return ps;
    }, keys);
    long id = keys.getKey().longValue();
    return findById(id).orElseThrow(() -> ApiException.notFound("Department not found"));
  }

  private Department map(java.sql.ResultSet rs, int rowNum) throws java.sql.SQLException {
    return new Department(rs.getLong("id"), rs.getString("name"), rs.getString("location"));
  }
}
