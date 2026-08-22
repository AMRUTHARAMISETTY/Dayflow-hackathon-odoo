package com.dayflow.api.ticket;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class HrTicketMessageRepository {
  private static final String SELECT = """
      select m.id, m.ticket_id, coalesce(ae.name, 'Employee') author_name, m.body, m.internal_note, m.created_at
      from hr_ticket_messages m
      left join users u on u.id = m.author_user_id
      left join employees ae on ae.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;

  public HrTicketMessageRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public long create(long ticketId, Long authorUserId, String body, boolean internalNote) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement(
          "insert into hr_ticket_messages(ticket_id, author_user_id, body, internal_note) values (?, ?, ?, ?)", new String[] {"id"});
      ps.setLong(1, ticketId);
      if (authorUserId != null) {
        ps.setLong(2, authorUserId);
      } else {
        ps.setNull(2, java.sql.Types.BIGINT);
      }
      ps.setString(3, body);
      ps.setBoolean(4, internalNote);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public List<HrTicketMessage> forTicket(long ticketId, boolean includeInternal) {
    String where = includeInternal ? "" : " and m.internal_note = false ";
    return jdbc.query(SELECT + " where m.ticket_id = ? " + where + " order by m.created_at", this::map, ticketId);
  }

  private HrTicketMessage map(ResultSet rs, int rowNum) throws SQLException {
    return new HrTicketMessage(rs.getLong("id"), rs.getLong("ticket_id"), rs.getString("author_name"), rs.getString("body"),
        rs.getBoolean("internal_note"), rs.getTimestamp("created_at").toLocalDateTime());
  }
}
