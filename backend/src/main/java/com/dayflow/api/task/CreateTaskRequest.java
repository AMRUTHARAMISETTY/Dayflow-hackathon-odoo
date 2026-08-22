package com.dayflow.api.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateTaskRequest(
    @NotNull Long projectId,
    Long teamId,
    @NotBlank String title,
    String description,
    String type,
    String status,
    String priority,
    Long reporterEmployeeId,
    Long reviewerEmployeeId,
    LocalDate dueDate,
    BigDecimal estimatedHours,
    String automationHint,
    List<Long> assigneeEmployeeIds) {}
