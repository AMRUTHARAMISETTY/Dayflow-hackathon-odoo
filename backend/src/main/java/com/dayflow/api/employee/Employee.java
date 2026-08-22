package com.dayflow.api.employee;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record Employee(
    long id,
    String employeeCode,
    String name,
    String email,
    String phone,
    Long departmentId,
    String departmentName,
    String designation,
    Long managerId,
    String managerName,
    String location,
    String employmentType,
    String status,
    LocalDate joiningDate,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    boolean hasLoginAccount,
    boolean bankVerified,
    boolean taxIdVerified) {
}
