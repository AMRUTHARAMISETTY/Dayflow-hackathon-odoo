package com.dayflow.api.role;

import java.util.List;
import java.util.Set;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RoleRepository {
  private final JdbcTemplate jdbc;

  public RoleRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<Role> findAll() {
    List<Role> roles = jdbc.query("select id, name, description from roles order by id",
        (rs, i) -> new Role(rs.getLong("id"), rs.getString("name"), rs.getString("description"), List.of()));
    return roles.stream()
        .map(r -> new Role(r.id(), r.name(), r.description(), jdbc.queryForList("""
            select p.code from permissions p
            join role_permissions rp on rp.permission_id = p.id
            where rp.role_id = ? order by p.code
            """, String.class, r.id())))
        .toList();
  }

  public long idByName(String name) {
    return jdbc.queryForObject("select id from roles where name = ?", Long.class, name);
  }

  public Set<String> permissionsForRole(long roleId) {
    return Set.copyOf(jdbc.queryForList("""
        select p.code from permissions p
        join role_permissions rp on rp.permission_id = p.id
        where rp.role_id = ? order by p.code
        """, String.class, roleId));
  }
}
