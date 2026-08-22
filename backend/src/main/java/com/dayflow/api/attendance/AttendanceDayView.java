package com.dayflow.api.attendance;

import java.time.LocalDate;
import java.time.LocalDateTime;

/** A resolved, API-facing view for one employee on one day — synthesizes Absent/Holiday/Weekend
 * when no row exists, rather than requiring one to be physically stored for every employee. */
public record AttendanceDayView(
    long employeeId,
    String employeeName,
    String departmentName,
    LocalDate workDate,
    LocalDateTime checkIn,
    LocalDateTime checkOut,
    String status,
    int lateMinutes,
    int earlyDepartureMinutes,
    int overtimeMinutes,
    boolean missingCheckout) {
}
