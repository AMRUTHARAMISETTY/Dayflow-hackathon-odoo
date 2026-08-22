package com.dayflow.api.task;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TaskItem(
    long id,
    long projectId,
    String projectName,
    Long teamId,
    String teamName,
    String title,
    String description,
    String type,
    String status,
    String priority,
    Long reporterEmployeeId,
    String reporterName,
    Long reviewerEmployeeId,
    String reviewerName,
    LocalDate dueDate,
    BigDecimal estimatedHours,
    BigDecimal actualHours,
    String automationHint,
    int assigneeCount,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {}
