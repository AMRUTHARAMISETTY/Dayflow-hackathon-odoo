package com.dayflow.api.task;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TaskAssignee(
    long id,
    long taskId,
    long employeeId,
    String employeeName,
    String role,
    BigDecimal allocationPercent,
    LocalDateTime assignedAt) {}
