package com.dayflow.api.team;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record Team(
    long id,
    String name,
    String code,
    String type,
    String description,
    String objective,
    Long departmentId,
    String departmentName,
    String location,
    String costCenter,
    Long ownerEmployeeId,
    String ownerName,
    Long leadEmployeeId,
    String leadName,
    Long deputyLeadEmployeeId,
    String deputyLeadName,
    LocalDate startDate,
    LocalDate endDate,
    String workingDays,
    String timeZone,
    Long defaultShiftId,
    String visibility,
    BigDecimal capacityHoursPerWeek,
    String notificationSettings,
    boolean active,
    int memberCount,
    int activeTaskCount,
    LocalDateTime createdAt) {}
