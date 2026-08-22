package com.dayflow.api.attendance;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record AttendanceCorrection(
    long id,
    long employeeId,
    String employeeName,
    LocalDate workDate,
    LocalDateTime requestedCheckIn,
    LocalDateTime requestedCheckOut,
    String reason,
    String evidenceNote,
    String status,
    String decidedByName,
    String decisionReason,
    LocalDateTime createdAt,
    LocalDateTime decidedAt) {
}
