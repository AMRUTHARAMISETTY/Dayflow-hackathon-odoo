package com.dayflow.api.email;

import java.time.LocalDateTime;
import java.util.List;

public record EmailMessage(
    long id,
    String senderName,
    Long templateId,
    String subject,
    String body,
    List<Long> recipientEmployeeIds,
    int recipientCount,
    String status,
    LocalDateTime scheduledAt,
    LocalDateTime sentAt,
    boolean bulkConfirmed,
    String failureReason,
    LocalDateTime createdAt) {
}
