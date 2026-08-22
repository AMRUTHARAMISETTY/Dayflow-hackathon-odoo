package com.dayflow.api.payroll;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PayrollRun(
    long id,
    String periodMonth,
    String status,
    String calculatedByName,
    LocalDateTime calculatedAt,
    String approvedByName,
    LocalDateTime approvedAt,
    String approvalReason,
    String publishedByName,
    LocalDateTime publishedAt,
    LocalDateTime paidAt,
    BigDecimal totalGross,
    BigDecimal totalDeductions,
    BigDecimal totalNet,
    int employeeCount,
    String createdByName,
    LocalDateTime createdAt) {
}
