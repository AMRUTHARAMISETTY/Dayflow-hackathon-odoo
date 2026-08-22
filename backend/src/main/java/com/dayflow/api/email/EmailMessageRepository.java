package com.dayflow.api.email;

import com.dayflow.api.common.PageResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class EmailMessageRepository {
  private static final String SELECT = """
      select m.id, coalesce(se.name, 'System') sender_name, m.template_id, m.subject, m.body,
             m.recipient_employee_ids, m.recipient_count, m.status, m.scheduled_at, m.sent_at,
             m.bulk_confirmed, m.failure_reason, m.created_at
      from email_messages m
      left join users u on u.id = m.sender_user_id
      left join employees se on se.id = u.employee_id
      """;

  private final JdbcTemplate jdbc;
  private final ObjectMapper objectMapper;

  public EmailMessageRepository(JdbcTemplate jdbc, ObjectMapper objectMapper) {
    this.jdbc = jdbc;
    this.objectMapper = objectMapper;
  }

  public long create(long senderUserId, Long templateId, String subject, String body, List<Long> recipientIds,
      String status, LocalDateTime scheduledAt, boolean bulkConfirmed, String idempotencyKey) {
    KeyHolder keys = new GeneratedKeyHolder();
    String recipientsJson = writeJson(recipientIds);
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("""
          insert into email_messages(sender_user_id, template_id, subject, body, recipient_employee_ids,
                                      recipient_count, status, scheduled_at, bulk_confirmed, idempotency_key)
          values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """, new String[] {"id"});
      ps.setLong(1, senderUserId);
      if (templateId != null) {
        ps.setLong(2, templateId);
      } else {
        ps.setNull(2, java.sql.Types.BIGINT);
      }
      ps.setString(3, subject);
      ps.setString(4, body);
      ps.setString(5, recipientsJson);
      ps.setInt(6, recipientIds.size());
      ps.setString(7, status);
      ps.setTimestamp(8, scheduledAt == null ? null : Timestamp.valueOf(scheduledAt));
      ps.setBoolean(9, bulkConfirmed);
      ps.setString(10, idempotencyKey);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  public Optional<Long> findIdByIdempotencyKey(String idempotencyKey) {
    try {
      return Optional.ofNullable(jdbc.queryForObject("select id from email_messages where idempotency_key = ?", Long.class, idempotencyKey));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public void markSent(long id) {
    jdbc.update("update email_messages set status = 'SENT', sent_at = current_timestamp where id = ?", id);
  }

  public void markFailed(long id, String reason) {
    jdbc.update("update email_messages set status = 'FAILED', failure_reason = ? where id = ?", reason, id);
  }

  public Optional<EmailMessage> findById(long id) {
    try {
      return Optional.of(jdbc.queryForObject(SELECT + " where m.id = ?", this::map, id));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  public PageResponse<EmailMessage> search(String status, int page, int size) {
    List<Object> args = new ArrayList<>();
    StringBuilder where = new StringBuilder(" where 1=1 ");
    if (status != null && !status.isBlank()) {
      where.append(" and m.status = ? ");
      args.add(status);
    }
    List<Object> pagedArgs = new ArrayList<>(args);
    pagedArgs.add(size);
    pagedArgs.add(page * size);
    List<EmailMessage> items = jdbc.query(SELECT + where + " order by m.created_at desc limit ? offset ? ", this::map, pagedArgs.toArray());
    long total = jdbc.queryForObject("select count(*) from email_messages m " + where, Long.class, args.toArray());
    return new PageResponse<>(items, page, size, total);
  }

  private String writeJson(List<Long> ids) {
    try {
      return objectMapper.writeValueAsString(ids);
    } catch (Exception ex) {
      throw new IllegalStateException(ex);
    }
  }

  private List<Long> readJson(String json) {
    try {
      return objectMapper.readValue(json, new TypeReference<List<Long>>() { });
    } catch (Exception ex) {
      return List.of();
    }
  }

  private EmailMessage map(ResultSet rs, int rowNum) throws SQLException {
    Timestamp scheduledAt = rs.getTimestamp("scheduled_at");
    Timestamp sentAt = rs.getTimestamp("sent_at");
    return new EmailMessage(
        rs.getLong("id"), rs.getString("sender_name"), (Long) rs.getObject("template_id"), rs.getString("subject"),
        rs.getString("body"), readJson(rs.getString("recipient_employee_ids")), rs.getInt("recipient_count"),
        rs.getString("status"), scheduledAt == null ? null : scheduledAt.toLocalDateTime(),
        sentAt == null ? null : sentAt.toLocalDateTime(), rs.getBoolean("bulk_confirmed"), rs.getString("failure_reason"),
        rs.getTimestamp("created_at").toLocalDateTime());
  }
}
