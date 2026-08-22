package com.dayflow.api.employee;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

record CreateEmployeeRequest(
    @NotBlank String name,
    @Email @NotBlank String email,
    String phone,
    Long departmentId,
    String designation,
    Long managerId,
    String location,
    String employmentType,
    LocalDate joiningDate) {
}

record BasicUpdateRequest(String phone) {
}

record SensitiveUpdateRequest(
    Long departmentId,
    String designation,
    Long managerId,
    String location,
    String employmentType,
    LocalDate effectiveDate,
    @NotBlank String reason) {
}

record StatusChangeRequest(LocalDate effectiveDate, @NotBlank String reason) {
}
