package com.dayflow.api.payroll;

import java.math.BigDecimal;

public record PayrollLine(
    long id,
    long payrollRunId,
    long employeeId,
    String employeeName,
    String departmentName,
    BigDecimal basic,
    BigDecimal hra,
    BigDecimal allowances,
    BigDecimal overtimePay,
    BigDecimal grossEarnings,
    BigDecimal unpaidLeaveDays,
    BigDecimal unpaidLeaveDeduction,
    BigDecimal taxDeduction,
    BigDecimal otherDeductions,
    BigDecimal totalDeductions,
    BigDecimal netPay) {
}
