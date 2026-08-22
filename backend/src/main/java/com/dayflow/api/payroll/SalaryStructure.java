package com.dayflow.api.payroll;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record SalaryStructure(
    long id,
    long employeeId,
    String employeeName,
    LocalDate effectiveFrom,
    LocalDate effectiveTo,
    BigDecimal basicMonthly,
    BigDecimal hraMonthly,
    BigDecimal allowancesMonthly,
    BigDecimal recurringDeductionsMonthly,
    BigDecimal grossMonthly,
    String status,
    String reason,
    String createdByName,
    LocalDateTime createdAt) {
}
