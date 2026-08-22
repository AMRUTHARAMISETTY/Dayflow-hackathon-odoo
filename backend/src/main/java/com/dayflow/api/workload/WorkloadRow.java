package com.dayflow.api.workload;

import java.math.BigDecimal;

public record WorkloadRow(
    long employeeId,
    String employeeName,
    String departmentName,
    String designation,
    long teamId,
    String teamName,
    BigDecimal allocationPercent,
    BigDecimal weeklyCapacityHours,
    BigDecimal assignedOpenHours,
    BigDecimal approvedLeaveDays,
    BigDecimal remainingHours,
    String riskLevel) {}
