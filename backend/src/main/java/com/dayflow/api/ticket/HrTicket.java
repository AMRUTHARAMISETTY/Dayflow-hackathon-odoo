package com.dayflow.api.ticket;

import java.time.LocalDateTime;

public record HrTicket(
    long id,
    long employeeId,
    String employeeName,
    String category,
    String subject,
    String description,
    String status,
    String priority,
    boolean confidential,
    String assignedToName,
    Long assignedToUserId,
    LocalDateTime slaDueAt,
    LocalDateTime resolvedAt,
    LocalDateTime closedAt,
    Integer satisfactionRating,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
