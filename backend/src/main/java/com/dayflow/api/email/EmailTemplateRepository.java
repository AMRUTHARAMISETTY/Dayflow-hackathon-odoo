package com.dayflow.api.email;

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
public class EmailTemplateRepository {
  private static final String SELECT = """
      select t.id, t.code, t.category, t.name, t.subject, t.body, t.active,
             coalesce(ce.name, 'System') created_by_name, t.created_at, t.updated_at
      from email_templates t
      left join users u on u.id = t.created_by_user_id
      left join employees ce on ce.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public EmailTemplateRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public List<EmailTemplate> findAllActive() {
    return jdbc.query(SELECT + " where t.active = true order by t.category, t.name", this::map);
  }

  public Optional<EmailTemplate> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where t.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public long create(String code, String category, String name, String subject, String body, long createdByUserId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into email_templates(code, category, name, subject, body, created_by_user_id) values (?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setString(1, code);
      ps.setString(2, category);
      ps.setString(3, name);
      ps.setString(4, subject);
      ps.setString(5, body);
      ps.setLong(6, createdByUserId);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void setActive(long id, boolean active) {
    jdbc.update("update email_templates set active = ?, updated_at = current_timestamp where id = ?", active, id);
  }

  private EmailTemplate map(ResultSet rs, int rowNum) throws SQLException {
    return new EmailTemplate(rs.getLong("id"), rs.getString("code"), rs.getString("category"), rs.getString("name"),
        rs.getString("subject"), rs.getString("body"), rs.getBoolean("active"), rs.getString("created_by_name"),
        rs.getTimestamp("created_at").toLocalDateTime(), rs.getTimestamp("updated_at").toLocalDateTime());
  }
}
