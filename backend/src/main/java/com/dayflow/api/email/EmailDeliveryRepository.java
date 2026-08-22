package com.dayflow.api.email;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class EmailDeliveryRepository {
  private static final String SELECT = """
      select d.id, d.email_message_id, d.employee_id, e.name employee_name, d.email_address, d.status,
             d.sent_at, d.error_message
      from email_deliveries d
      join employees e on e.id = d.employee_id
      """;

  private final JdbcTemplate jdbc;

  public EmailDeliveryRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long emailMessageId, long employeeId, String emailAddress) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into email_deliveries(email_message_id, employee_id, email_address) values (?, ?, ?)", new String[] {"id"});
      ps.setLong(1, emailMessageId);
      ps.setLong(2, employeeId);
      ps.setString(3, emailAddress);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public void markSent(long id) {
    jdbc.update("update email_deliveries set status = 'SENT', sent_at = current_timestamp where id = ?", id);
  }

  public void markFailed(long id, String errorMessage) {
    jdbc.update("update email_deliveries set status = 'FAILED', error_message = ? where id = ?", errorMessage, id);
  }

  public List<EmailDelivery> forMessage(long emailMessageId) {
    return jdbc.query(SELECT + " where d.email_message_id = ? order by e.name", this::map, emailMessageId);
  }

  private EmailDelivery map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp sentAt = rs.getTimestamp("sent_at");
    return new EmailDelivery(rs.getLong("id"), rs.getLong("email_message_id"), rs.getLong("employee_id"),
        rs.getString("employee_name"), rs.getString("email_address"), rs.getString("status"),
        sentAt == null ? null : sentAt.toLocalDateTime(), rs.getString("error_message"));
  }
}
