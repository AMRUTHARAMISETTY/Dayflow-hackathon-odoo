package com.dayflow.api.attendance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalDateTime;

record CorrectionRequest(
    @NotNull LocalDate workDate,
    LocalDateTime requestedCheckIn,
    LocalDateTime requestedCheckOut,
    @NotBlank String reason,
    String evidenceNote) {
}

record CorrectionDecisionRequest(boolean approve, @NotBlank String reason) {
}

record AttendanceSummary(long employeeId, LocalDate from, LocalDate to, int presentDays, int absentDays,
    int onLeaveDays, int lateDays, int totalLateMinutes, int totalOvertimeMinutes) {
}
