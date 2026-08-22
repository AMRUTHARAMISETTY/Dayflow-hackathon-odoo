package com.dayflow.api.attendance;

import com.dayflow.api.approval.ApprovalRouter;
import com.dayflow.api.audit.AuditService;
import com.dayflow.api.calendar.WorkingDayCalculator;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.notification.NotificationService;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.shift.Shift;
import com.dayflow.api.shift.ShiftRepository;
import com.dayflow.api.user.UserRepository;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AttendanceService {
  private final AttendanceRepository attendanceRepository;
  private final AttendanceCorrectionRepository correctionRepository;
  private final EmployeeRepository employeeRepository;
  private final ShiftRepository shiftRepository;
  private final WorkingDayCalculator workingDayCalculator;
  private final AuditService auditService;
  private final NotificationService notificationService;
  private final ApprovalRouter approvalRouter;
  private final UserRepository userRepository;

  public AttendanceService(AttendanceRepository attendanceRepository, AttendanceCorrectionRepository correctionRepository,
      EmployeeRepository employeeRepository, ShiftRepository shiftRepository, WorkingDayCalculator workingDayCalculator,
      AuditService auditService, NotificationService notificationService, ApprovalRouter approvalRouter,
      UserRepository userRepository) {
    this.attendanceRepository = attendanceRepository;
    this.correctionRepository = correctionRepository;
    this.employeeRepository = employeeRepository;
    this.shiftRepository = shiftRepository;
    this.workingDayCalculator = workingDayCalculator;
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.approvalRouter = approvalRouter;
    this.userRepository = userRepository;
  }

  @Transactional
  public AttendanceDayView checkIn(CurrentUser actor) {
    actor.require("attendance:checkin");
    LocalDate today = LocalDate.now();
    LocalDateTime now = LocalDateTime.now();
    Optional<AttendanceRecord> existing = attendanceRepository.findByEmployeeAndDate(actor.employeeId(), today);
    if (existing.isPresent()) {
      throw ApiException.conflict(existing.get().checkOut() == null
          ? "You're already checked in for today."
          : "You've already recorded attendance for today.");
    }
    long recordId = attendanceRepository.checkIn(actor.employeeId(), today, now);
    Optional<Shift> shift = shiftRepository.findByEmployeeId(actor.employeeId());
    shift.ifPresent(s -> {
      int late = lateMinutes(s, now);
      if (late > 0) {
        attendanceRepository.updateLateMinutes(recordId, late);
      }
    });
    auditService.record(actor.userId(), "CHECK_IN", "AttendanceRecord", String.valueOf(recordId), null,
        Map.of("checkIn", now.toString()), null);
    return resolveOne(employeeRepository.requireById(actor.employeeId()), today);
  }

  @Transactional
  public AttendanceDayView checkOut(CurrentUser actor) {
    actor.require("attendance:checkin");
    LocalDate today = LocalDate.now();
    LocalDateTime now = LocalDateTime.now();
    AttendanceRecord existing = attendanceRepository.findByEmployeeAndDate(actor.employeeId(), today)
        .orElseThrow(() -> ApiException.badRequest("You haven't checked in today."));
    if (existing.checkOut() != null) {
      throw ApiException.conflict("You've already checked out today.");
    }
    Optional<Shift> shift = shiftRepository.findByEmployeeId(actor.employeeId());
    int late = existing.lateMinutes();
    int early = 0;
    int overtime = 0;
    if (shift.isPresent()) {
      late = lateMinutes(shift.get(), existing.checkIn());
      early = earlyDepartureMinutes(shift.get(), now);
      overtime = overtimeMinutes(shift.get(), existing.checkIn(), now);
    }
    attendanceRepository.checkOut(existing.id(), now, late, early, overtime);
    auditService.record(actor.userId(), "CHECK_OUT", "AttendanceRecord", String.valueOf(existing.id()), existing,
        Map.of("checkOut", now.toString(), "lateMinutes", late, "overtimeMinutes", overtime), null);
    return resolveOne(employeeRepository.requireById(actor.employeeId()), today);
  }

  public List<AttendanceDayView> today(CurrentUser actor, Long departmentId) {
    List<Employee> scope = scopedActiveEmployees(actor, departmentId);
    return resolveForDate(scope, LocalDate.now());
  }

  public List<AttendanceDayView> forEmployee(CurrentUser actor, long employeeId, LocalDate from, LocalDate to) {
    Employee employee = employeeRepository.requireById(employeeId);
    assertCanView(actor, employee);
    if (from.isAfter(to) || Duration.between(from.atStartOfDay(), to.atStartOfDay()).toDays() > 92) {
      throw ApiException.badRequest("Date range must be 92 days or fewer.");
    }
    return resolveRangeForEmployee(employee, from, to);
  }

  public AttendanceSummary summaryForEmployee(CurrentUser actor, long employeeId, LocalDate from, LocalDate to) {
    List<AttendanceDayView> days = forEmployee(actor, employeeId, from, to);
    int present = 0;
    int absent = 0;
    int onLeave = 0;
    int late = 0;
    int totalLate = 0;
    int totalOvertime = 0;
    for (AttendanceDayView day : days) {
      switch (day.status()) {
        case "Present" -> present++;
        case "Absent" -> absent++;
        case "On Leave" -> onLeave++;
        default -> { }
      }
      if (day.lateMinutes() > 0) {
        late++;
      }
      totalLate += day.lateMinutes();
      totalOvertime += day.overtimeMinutes();
    }
    return new AttendanceSummary(employeeId, from, to, present, absent, onLeave, late, totalLate, totalOvertime);
  }

  @Transactional
  public AttendanceCorrection requestCorrection(CurrentUser actor, CorrectionRequest request) {
    actor.require("attendance:correct");
    if (request.workDate().isAfter(LocalDate.now())) {
      throw ApiException.badRequest("Cannot request a correction for a future date.");
    }
    Employee employee = employeeRepository.requireById(actor.employeeId());
    long id = correctionRepository.create(actor.employeeId(), request.workDate(), request.requestedCheckIn(),
        request.requestedCheckOut(), request.reason(), request.evidenceNote());
    AttendanceCorrection created = correctionRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "REQUEST_ATTENDANCE_CORRECTION", "AttendanceCorrection", String.valueOf(id),
        null, created, request.reason());

    List<Long> approverUserIds = approvalRouter.routeApprovers(employee, "attendance:approve_correction");
    for (Long userId : approverUserIds) {
      notificationService.notify(userId, "ATTENDANCE", "INFO", "Attendance correction requested",
          employee.name() + " requested a correction for " + request.workDate(), "/attendance/corrections");
    }
    return created;
  }

  @Transactional
  public AttendanceCorrection decideCorrection(CurrentUser actor, long id, CorrectionDecisionRequest request) {
    actor.require("attendance:approve_correction");
    AttendanceCorrection correction = correctionRepository.findById(id)
        .orElseThrow(() -> ApiException.notFound("Correction request not found."));
    if (!"PENDING".equals(correction.status())) {
      throw ApiException.conflict("This correction has already been decided.");
    }
    Employee employee = employeeRepository.requireById(correction.employeeId());
    if (!actor.has("attendance:read") && !Objects.equals(employee.managerId(), actor.employeeId())) {
      throw ApiException.forbidden("You can only decide corrections for your direct reports.");
    }

    correctionRepository.decide(id, request.approve(), request.reason(), actor.userId());

    if (request.approve()) {
      Optional<Shift> shift = shiftRepository.findByEmployeeId(correction.employeeId());
      int late = 0;
      int early = 0;
      int overtime = 0;
      if (shift.isPresent() && correction.requestedCheckIn() != null) {
        late = lateMinutes(shift.get(), correction.requestedCheckIn());
      }
      if (shift.isPresent() && correction.requestedCheckOut() != null) {
        early = earlyDepartureMinutes(shift.get(), correction.requestedCheckOut());
      }
      if (shift.isPresent() && correction.requestedCheckIn() != null && correction.requestedCheckOut() != null) {
        overtime = overtimeMinutes(shift.get(), correction.requestedCheckIn(), correction.requestedCheckOut());
      }
      attendanceRepository.applyCorrection(correction.employeeId(), correction.workDate(), correction.requestedCheckIn(),
          correction.requestedCheckOut(), late, early, overtime);
    }

    AttendanceCorrection decided = correctionRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), request.approve() ? "APPROVE_ATTENDANCE_CORRECTION" : "REJECT_ATTENDANCE_CORRECTION",
        "AttendanceCorrection", String.valueOf(id), correction, decided, request.reason());

    userRepository.findByEmployeeId(correction.employeeId()).ifPresent(account -> notificationService.notify(
        account.id(), "ATTENDANCE", request.approve() ? "INFO" : "WARNING",
        "Attendance correction " + (request.approve() ? "approved" : "rejected"),
        "Your correction for " + correction.workDate() + " was " + (request.approve() ? "approved." : "rejected: " + request.reason()),
        "/attendance"));
    return decided;
  }

  public PageResponse<AttendanceCorrection> listCorrections(CurrentUser actor, String status, Long employeeId, int page, int size) {
    if (actor.has("attendance:read")) {
      return correctionRepository.search(status, employeeId, null, null, page, size);
    }
    if (actor.has("attendance:approve_correction")) {
      return correctionRepository.search(status, employeeId, actor.employeeId(), actor.employeeId(), page, size);
    }
    if (actor.has("attendance:correct")) {
      return correctionRepository.search(status, actor.employeeId(), null, null, page, size);
    }
    throw ApiException.forbidden("You do not have permission to view attendance corrections.");
  }

  // Missing-checkout detection moved to the automation engine's ATTENDANCE_MISSING_CHECKOUT rule
  // (Phase 3) so HR can see its run history and disable it without a code change.

  // ---- resolution helpers ----

  private List<Employee> scopedActiveEmployees(CurrentUser actor, Long departmentId) {
    if (actor.has("attendance:read")) {
      return employeeRepository.findActive(departmentId, null, null);
    }
    if (actor.has("attendance:read:reports")) {
      return employeeRepository.findActive(null, actor.employeeId(), actor.employeeId());
    }
    if (actor.has("attendance:read:own")) {
      return employeeRepository.findActive(null, actor.employeeId(), null);
    }
    throw ApiException.forbidden("You do not have permission to view attendance.");
  }

  private void assertCanView(CurrentUser actor, Employee employee) {
    if (actor.has("attendance:read") || actor.employeeId() == employee.id()) {
      return;
    }
    if (actor.has("attendance:read:reports") && Objects.equals(employee.managerId(), actor.employeeId())) {
      return;
    }
    throw ApiException.forbidden("You do not have permission to view this employee's attendance.");
  }

  private List<AttendanceDayView> resolveForDate(List<Employee> employees, LocalDate date) {
    List<Long> ids = employees.stream().map(Employee::id).toList();
    Map<Long, AttendanceRecord> records = attendanceRepository.findForDate(ids, date);
    boolean holiday = !workingDayCalculator.holidaysBetween(date, date).isEmpty();
    boolean weekend = workingDayCalculator.isWeekend(date);
    return employees.stream().map(employee -> resolve(employee, date, records.get(employee.id()), holiday, weekend)).toList();
  }

  private AttendanceDayView resolveOne(Employee employee, LocalDate date) {
    return resolveForDate(List.of(employee), date).get(0);
  }

  private List<AttendanceDayView> resolveRangeForEmployee(Employee employee, LocalDate from, LocalDate to) {
    List<AttendanceRecord> raw = attendanceRepository.findRange(employee.id(), from, to);
    Map<LocalDate, AttendanceRecord> byDate = raw.stream()
        .collect(java.util.stream.Collectors.toMap(AttendanceRecord::workDate, r -> r));
    var holidays = workingDayCalculator.holidaysBetween(from, to);
    List<AttendanceDayView> result = new java.util.ArrayList<>();
    for (LocalDate date = from; !date.isAfter(to); date = date.plusDays(1)) {
      result.add(resolve(employee, date, byDate.get(date), holidays.contains(date), workingDayCalculator.isWeekend(date)));
    }
    return result;
  }

  private AttendanceDayView resolve(Employee employee, LocalDate date, AttendanceRecord record, boolean holiday, boolean weekend) {
    LocalDate today = LocalDate.now();
    if (record != null) {
      boolean missingCheckout = record.checkOut() == null && date.isBefore(today);
      return new AttendanceDayView(employee.id(), employee.name(), employee.departmentName(), date, record.checkIn(),
          record.checkOut(), record.status(), record.lateMinutes(), record.earlyDepartureMinutes(),
          record.overtimeMinutes(), missingCheckout);
    }
    String status;
    if (holiday) {
      status = "Holiday";
    } else if (weekend) {
      status = "Weekend";
    } else if (date.isBefore(today)) {
      status = "Absent";
    } else if (date.isEqual(today)) {
      status = "Not Checked In";
    } else {
      status = "Upcoming";
    }
    return new AttendanceDayView(employee.id(), employee.name(), employee.departmentName(), date, null, null, status, 0, 0, 0, false);
  }

  private int lateMinutes(Shift shift, LocalDateTime checkIn) {
    if (checkIn == null) {
      return 0;
    }
    LocalTime graceStart = shift.startTime().plusMinutes(shift.graceMinutes());
    LocalTime actual = checkIn.toLocalTime();
    if (actual.isAfter(graceStart)) {
      return (int) Duration.between(graceStart, actual).toMinutes();
    }
    return 0;
  }

  private int earlyDepartureMinutes(Shift shift, LocalDateTime checkOut) {
    if (checkOut == null) {
      return 0;
    }
    LocalTime actual = checkOut.toLocalTime();
    if (actual.isBefore(shift.endTime())) {
      return (int) Duration.between(actual, shift.endTime()).toMinutes();
    }
    return 0;
  }

  private int overtimeMinutes(Shift shift, LocalDateTime checkIn, LocalDateTime checkOut) {
    if (checkIn == null || checkOut == null) {
      return 0;
    }
    long workedMinutes = Duration.between(checkIn, checkOut).toMinutes() - shift.breakMinutes();
    long scheduledMinutes = Duration.between(shift.startTime(), shift.endTime()).toMinutes() - shift.breakMinutes();
    long overtime = workedMinutes - scheduledMinutes;
    return overtime > 0 ? (int) overtime : 0;
  }
}
