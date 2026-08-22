package com.dayflow.api.audit;

import com.dayflow.api.common.RequestContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

/**
 * Writes immutable audit entries for sensitive actions. Before/after values are captured as JSON
 * so the audit log page can render a real diff (spec section 21: "actor, action, entity,
 * before/after values, reason and timestamp").
 */
@Service
public class AuditService {
  private final AuditRepository repository;
  private final ObjectMapper objectMapper;

  public AuditService(AuditRepository repository, ObjectMapper objectMapper) {
    this.repository = repository;
    this.objectMapper = objectMapper;
  }

  public void record(Long actorUserId, String action, String entity, String entityId, Object previousValue,
      Object newValue, String reason) {
    repository.insert(
        actorUserId,
        action,
        entity,
        entityId,
        toJson(previousValue),
        toJson(newValue),
        reason,
        RequestContext.requestId(),
        RequestContext.clientIp());
  }

  private String toJson(Object value) {
    if (value == null) {
      return null;
    }
    try {
      return objectMapper.writeValueAsString(value);
    } catch (Exception ex) {
      return String.valueOf(value);
    }
  }
}
