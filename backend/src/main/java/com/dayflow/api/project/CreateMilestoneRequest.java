package com.dayflow.api.project;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateMilestoneRequest(
    @NotBlank String name,
    String status,
    LocalDate dueDate,
    BigDecimal completionPercent) {}
