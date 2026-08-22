package com.dayflow.api.team;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateTeamRequest(
    @NotBlank String name,
    @NotBlank String code,
    @NotBlank String type,
    String description,
    String objective,
    Long departmentId,
    String location,
    String costCenter,
    Long ownerEmployeeId,
    Long leadEmployeeId,
    Long deputyLeadEmployeeId,
    LocalDate startDate,
    LocalDate endDate,
    String workingDays,
    String timeZone,
    Long defaultShiftId,
    String visibility,
    @DecimalMin("1.00") BigDecimal capacityHoursPerWeek,
    String notificationSettings) {}
