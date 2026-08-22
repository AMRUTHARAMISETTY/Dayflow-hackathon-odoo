package com.dayflow.api.leave;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record LeaveRequest(
    long id,
    long employeeId,
    String employeeName,
    long leaveTypeId,
    String leaveTypeName,
    LocalDate startDate,
    LocalDate endDate,
    BigDecimal days,
    String reason,
    String status,
    String approverName,
    String decisionReason,
    boolean autoApproved,
    LocalDateTime createdAt,
    LocalDateTime decidedAt,
    LocalDateTime cancelledAt) {
}
