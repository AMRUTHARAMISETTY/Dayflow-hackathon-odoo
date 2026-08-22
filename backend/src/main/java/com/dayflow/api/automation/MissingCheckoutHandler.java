package com.dayflow.api.automation;

import com.dayflow.api.attendance.AttendanceRecord;
import com.dayflow.api.attendance.AttendanceRepository;
import com.dayflow.api.notification.NotificationService;
import com.dayflow.api.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

/** Flags any past day that was checked in but never checked out, once. Was a hardcoded
 * {@code @Scheduled} method on AttendanceService in Phase 2; now runs through the automation
 * engine so HR can see its run history and turn it off without a code change. */
@Component
class MissingCheckoutHandler implements AutomationHandler {
  private final AttendanceRepository attendanceRepository;
  private final UserRepository userRepository;
  private final NotificationService notificationService;

  MissingCheckoutHandler(AttendanceRepository attendanceRepository, UserRepository userRepository,
      NotificationService notificationService) {
    this.attendanceRepository = attendanceRepository;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  @Override
  public String code() {
    return "ATTENDANCE_MISSING_CHECKOUT";
  }

  @Override
  public HandlerResult run(JsonNode config, boolean dryRun) {
    List<AttendanceRecord> candidates = attendanceRepository.findMissingCheckoutCandidates(LocalDate.now());
    int actions = 0;
    for (AttendanceRecord record : candidates) {
      if (dryRun) {
        continue;
      }
      userRepository.findByEmployeeId(record.employeeId()).ifPresent(account -> notificationService.notify(
          account.id(), "ATTENDANCE", "WARNING", "Missing checkout on " + record.workDate(),
          "You checked in on " + record.workDate() + " but never checked out. Request a correction if this looks wrong.",
          "/attendance"));
      attendanceRepository.markMissingCheckoutNotified(record.id());
      actions++;
    }
    String detail = dryRun
        ? "Would notify " + candidates.size() + " employee(s) about a missing checkout."
        : "Notified " + actions + " employee(s) about a missing checkout.";
    return new HandlerResult(candidates.size(), actions, detail);
  }
}
