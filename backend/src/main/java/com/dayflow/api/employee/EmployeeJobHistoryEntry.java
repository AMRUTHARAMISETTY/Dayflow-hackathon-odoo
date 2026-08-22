package com.dayflow.api.employee;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmployeeJobHistoryEntry(
    long id,
    Long departmentId,
    String departmentName,
    String designation,
    Long managerId,
    String managerName,
    String employmentType,
    String status,
    LocalDate effectiveDate,
    String changeType,
    String reason,
    String changedByName,
    LocalDateTime createdAt) {
}
