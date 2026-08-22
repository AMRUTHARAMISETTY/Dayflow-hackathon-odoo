package com.dayflow.api.audit;

import java.time.LocalDateTime;

public record AuditLogEntry(long id, Long actorUserId, String actorName, String action, String entity,
    String entityId, String previousValue, String newValue, String reason, String requestId, String ipAddress,
    LocalDateTime createdAt) {
}
