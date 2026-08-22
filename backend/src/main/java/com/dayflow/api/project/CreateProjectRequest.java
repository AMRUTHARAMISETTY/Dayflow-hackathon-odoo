package com.dayflow.api.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CreateProjectRequest(
    @NotBlank String name,
    @NotBlank String code,
    String description,
    String businessOutcome,
    String status,
    String priority,
    @NotNull Long sponsorEmployeeId,
    @NotNull Long ownerEmployeeId,
    LocalDate startDate,
    LocalDate targetDate,
    BigDecimal budgetAmount,
    List<Long> teamIds) {}
