package com.dayflow.api.task;

import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

public record UpdateTaskStatusRequest(@NotBlank String status, BigDecimal actualHours) {}
