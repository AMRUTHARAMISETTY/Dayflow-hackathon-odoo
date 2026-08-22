package com.dayflow.api.project;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record ProjectMilestone(
    long id,
    long projectId,
    String name,
    String status,
    LocalDate dueDate,
    BigDecimal completionPercent,
    LocalDateTime createdAt) {}
