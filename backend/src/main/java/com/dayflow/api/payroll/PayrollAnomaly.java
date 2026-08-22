package com.dayflow.api.payroll;

import java.time.LocalDateTime;

public record PayrollAnomaly(
    long id,
    long payrollRunId,
    Long employeeId,
    String employeeName,
    String issueCode,
    String severity,
    String possibleCause,
    String recommendedAction,
    boolean blocking,
    String reviewStatus,
    String resolutionNote,
    String reviewedByName,
    LocalDateTime reviewedAt,
    LocalDateTime createdAt) {
}
