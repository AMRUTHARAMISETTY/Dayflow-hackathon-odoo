package com.dayflow.api.project;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record Project(
    long id,
    String name,
    String code,
    String description,
    String businessOutcome,
    String status,
    String priority,
    long sponsorEmployeeId,
    String sponsorName,
    long ownerEmployeeId,
    String ownerName,
    LocalDate startDate,
    LocalDate targetDate,
    BigDecimal budgetAmount,
    BigDecimal completionPercent,
    int teamCount,
    int taskCount,
    int openTaskCount,
    LocalDateTime createdAt) {}
