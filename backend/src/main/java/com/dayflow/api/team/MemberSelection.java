package com.dayflow.api.team;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record MemberSelection(
    @NotNull Long employeeId,
    @NotBlank String teamRole,
    @DecimalMin("1.00") @DecimalMax("100.00") BigDecimal allocationPercent,
    LocalDate effectiveFrom,
    LocalDate effectiveTo,
    Long temporaryCoverEmployeeId,
    String delegationNote) {}
