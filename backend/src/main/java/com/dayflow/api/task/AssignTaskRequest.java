package com.dayflow.api.task;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record AssignTaskRequest(
    @NotNull Long employeeId,
    String role,
    @DecimalMin("1.00") @DecimalMax("100.00") BigDecimal allocationPercent) {}
