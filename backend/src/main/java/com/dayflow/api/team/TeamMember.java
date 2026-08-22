package com.dayflow.api.team;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record TeamMember(
    long id,
    long teamId,
    long employeeId,
    String employeeName,
    String departmentName,
    String designation,
    String teamRole,
    BigDecimal allocationPercent,
    LocalDate effectiveFrom,
    LocalDate effectiveTo,
    Long temporaryCoverEmployeeId,
    String temporaryCoverName,
    String delegationNote,
    boolean active,
    LocalDateTime createdAt) {}
