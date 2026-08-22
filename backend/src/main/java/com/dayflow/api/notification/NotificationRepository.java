package com.dayflow.api.notification;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {
  private final JdbcTemplate jdbc;

  public NotificationRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public Notification create(long userId, String category, String severity, String title, String body, String link) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into notifications(user_id, category, severity, title, body, link) values (?, ?, ?, ?, ?, ?)",
          new String[] {"id"});
      ps.setLong(1, userId);
      ps.setString(2, category);
      ps.setString(3, severity);
      ps.setString(4, title);
      ps.setString(5, body);
      ps.setString(6, link);
      return ps;
    }, keys);
    long id = keys.getKey().longValue();
    return jdbc.queryForObject(
        "select id, category, severity, title, body, link, read_at, created_at from notifications where id = ?",
        this::map, id);
  }

  public List<Notification> forUser(long userId, boolean unreadOnly, int limit) {
    String where = unreadOnly ? " and read_at is null " : "";
    return jdbc.query(
        "select id, category, severity, title, body, link, read_at, created_at from notifications where user_id = ?"
            + where + " order by created_at desc limit ?",
        this::map, userId, limit);
  }

  public int unreadCount(long userId) {
    Integer count = jdbc.queryForObject("select count(*) from notifications where user_id = ? and read_at is null", Integer.class, userId);
    return count == null ? 0 : count;
  }

  public void markRead(long userId, long notificationId) {
    jdbc.update("update notifications set read_at = current_timestamp where id = ? and user_id = ? and read_at is null",
        notificationId, userId);
  }

  public void markAllRead(long userId) {
    jdbc.update("update notifications set read_at = current_timestamp where user_id = ? and read_at is null", userId);
  }

  private Notification map(ResultSet rs, int rowNum) throws SQLException {
    var readAt = rs.getTimestamp("read_at");
    return new Notification(rs.getLong("id"), rs.getString("category"), rs.getString("severity"),
        rs.getString("title"), rs.getString("body"), rs.getString("link"),
        readAt == null ? null : readAt.toLocalDateTime(), rs.getTimestamp("created_at").toLocalDateTime());
  }
}
