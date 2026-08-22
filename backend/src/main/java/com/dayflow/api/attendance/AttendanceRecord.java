package com.dayflow.api.attendance;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** A raw stored row — only created by an actual check-in, a leave sync, or an approved correction. */
public record AttendanceRecord(
    long id,
    long employeeId,
    LocalDate workDate,
    LocalDateTime checkIn,
    LocalDateTime checkOut,
    String status,
    int lateMinutes,
    int earlyDepartureMinutes,
    int overtimeMinutes,
    boolean missingCheckoutNotified,
    String source) {
}
