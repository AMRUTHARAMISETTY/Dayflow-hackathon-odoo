package com.dayflow.api.payroll;

import com.dayflow.api.attendance.AttendanceCorrectionRepository;
import com.dayflow.api.attendance.AttendanceRecord;
import com.dayflow.api.attendance.AttendanceRepository;
import com.dayflow.api.audit.AuditService;
import com.dayflow.api.calendar.WorkingDayCalculator;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.notification.NotificationService;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.user.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The Draft -> Calculated -> Under Review -> Approved -> Published -> Paid cycle from spec
 * section 9, with maker-checker on approval (the approver must be a different person than
 * whoever calculated the run) and a blocking anomaly queue that publish cannot bypass.
 *
 * Tax is a flat placeholder rate, not a real slab-based statutory engine — building a
 * jurisdiction-correct tax calculator is out of scope here and documented as a limitation.
 */
@Service
public class PayrollService {
  private static final BigDecimal TAX_RATE = new BigDecimal("0.10");
  private static final BigDecimal STANDARD_MONTHLY_HOURS = new BigDecimal("208"); // 26 days x 8 hours
  private static final BigDecimal OVERTIME_MULTIPLIER = new BigDecimal("1.5");
  private static final BigDecimal SALARY_CHANGE_ALERT_RATIO = new BigDecimal("0.15");
  private static final int UNUSUAL_OVERTIME_MINUTES = 20 * 60;

  private final PayrollRunRepository payrollRunRepository;
  private final PayrollLineRepository payrollLineRepository;
  private final PayrollAnomalyRepository payrollAnomalyRepository;
  private final SalaryStructureRepository salaryStructureRepository;
  private final EmployeeRepository employeeRepository;
  private final AttendanceRepository attendanceRepository;
  private final AttendanceCorrectionRepository attendanceCorrectionRepository;
  private final WorkingDayCalculator workingDayCalculator;
  private final AuditService auditService;
  private final NotificationService notificationService;
  private final UserRepository userRepository;

  public PayrollService(PayrollRunRepository payrollRunRepository, PayrollLineRepository payrollLineRepository,
      PayrollAnomalyRepository payrollAnomalyRepository, SalaryStructureRepository salaryStructureRepository,
      EmployeeRepository employeeRepository, AttendanceRepository attendanceRepository,
      AttendanceCorrectionRepository attendanceCorrectionRepository, WorkingDayCalculator workingDayCalculator,
      AuditService auditService, NotificationService notificationService, UserRepository userRepository) {
    this.payrollRunRepository = payrollRunRepository;
    this.payrollLineRepository = payrollLineRepository;
    this.payrollAnomalyRepository = payrollAnomalyRepository;
    this.salaryStructureRepository = salaryStructureRepository;
    this.employeeRepository = employeeRepository;
    this.attendanceRepository = attendanceRepository;
    this.attendanceCorrectionRepository = attendanceCorrectionRepository;
    this.workingDayCalculator = workingDayCalculator;
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.userRepository = userRepository;
  }

  @Transactional
  public PayrollRun createRun(CurrentUser actor, CreatePayrollRunRequest request) {
    actor.require("payroll:manage");
    YearMonth.parse(request.periodMonth()); // throws if malformed beyond the regex check
    if (payrollRunRepository.existsForPeriod(request.periodMonth())) {
      throw ApiException.conflict("A payroll run for " + request.periodMonth() + " already exists.");
    }
    long id = payrollRunRepository.create(request.periodMonth(), actor.userId());
    PayrollRun created = payrollRunRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_PAYROLL_RUN", "PayrollRun", String.valueOf(id), null, created, null);
    return created;
  }

  @Transactional
  public PayrollRun calculate(CurrentUser actor, long runId) {
    actor.require("payroll:manage");
    PayrollRun run = requireRun(runId);
    if (!List.of("DRAFT", "CALCULATED").contains(run.status())) {
      throw ApiException.conflict("Only a draft or already-calculated run can be (re)calculated.");
    }

    YearMonth period = YearMonth.parse(run.periodMonth());
    LocalDate periodStart = period.atDay(1);
    LocalDate periodEnd = period.atEndOfMonth();

    payrollLineRepository.deleteForRun(runId);
    payrollAnomalyRepository.deleteForRun(runId);

    List<Employee> activeEmployees = employeeRepository.findActive(null, null, null);
    BigDecimal workingDays = BigDecimal.valueOf(workingDayCalculator.countWorkingDays(periodStart, periodEnd));
    var holidays = workingDayCalculator.holidaysBetween(periodStart, periodEnd);

    BigDecimal totalGross = BigDecimal.ZERO;
    BigDecimal totalDeductions = BigDecimal.ZERO;
    BigDecimal totalNet = BigDecimal.ZERO;
    int lineCount = 0;

    for (Employee employee : activeEmployees) {
      var structure = salaryStructureRepository.currentAsOf(employee.id(), periodStart);
      if (structure.isEmpty()) {
        payrollAnomalyRepository.insert(runId, employee.id(), "MISSING_SALARY_STRUCTURE", "CRITICAL",
            "No active salary structure is configured for this employee.",
            "Ask HR Admin to create a salary structure before publishing.", true);
        continue;
      }
      SalaryStructure salary = structure.get();

      List<AttendanceRecord> records = attendanceRepository.findRange(employee.id(), periodStart, periodEnd);
      Map<LocalDate, AttendanceRecord> byDate = records.stream().collect(Collectors.toMap(AttendanceRecord::workDate, r -> r));
      int unpaidDays = 0;
      int overtimeMinutes = 0;
      for (LocalDate date = periodStart; !date.isAfter(periodEnd) && !date.isAfter(LocalDate.now()); date = date.plusDays(1)) {
        AttendanceRecord record = byDate.get(date);
        if (record != null) {
          overtimeMinutes += record.overtimeMinutes();
          continue;
        }
        if (workingDayCalculator.isWorkingDay(date, holidays)) {
          unpaidDays++;
        }
      }

      BigDecimal gross = salary.basicMonthly().add(salary.hraMonthly()).add(salary.allowancesMonthly());
      BigDecimal perDayRate = workingDays.signum() > 0 ? gross.divide(workingDays, 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
      BigDecimal unpaidLeaveDeduction = perDayRate.multiply(BigDecimal.valueOf(unpaidDays)).setScale(2, RoundingMode.HALF_UP);

      BigDecimal hourlyRate = salary.basicMonthly().divide(STANDARD_MONTHLY_HOURS, 4, RoundingMode.HALF_UP);
      BigDecimal overtimeHours = BigDecimal.valueOf(overtimeMinutes).divide(BigDecimal.valueOf(60), 4, RoundingMode.HALF_UP);
      BigDecimal overtimePay = hourlyRate.multiply(OVERTIME_MULTIPLIER).multiply(overtimeHours).setScale(2, RoundingMode.HALF_UP);

      BigDecimal grossEarnings = gross.add(overtimePay);
      BigDecimal taxDeduction = grossEarnings.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
      BigDecimal otherDeductions = salary.recurringDeductionsMonthly();
      BigDecimal lineDeductions = unpaidLeaveDeduction.add(taxDeduction).add(otherDeductions);
      BigDecimal netPay = grossEarnings.subtract(lineDeductions);

      payrollLineRepository.insert(runId, employee.id(), salary.id(), salary.basicMonthly(), salary.hraMonthly(),
          salary.allowancesMonthly(), overtimePay, grossEarnings, BigDecimal.valueOf(unpaidDays), unpaidLeaveDeduction,
          taxDeduction, otherDeductions, lineDeductions, netPay);

      raiseAnomalies(runId, employee, netPay, overtimeMinutes, grossEarnings);

      totalGross = totalGross.add(grossEarnings);
      totalDeductions = totalDeductions.add(lineDeductions);
      totalNet = totalNet.add(netPay);
      lineCount++;
    }

    payrollRunRepository.markCalculated(runId, actor.userId(), totalGross, totalDeductions, totalNet, lineCount);
    PayrollRun recalculated = requireRun(runId);
    auditService.record(actor.userId(), "CALCULATE_PAYROLL", "PayrollRun", String.valueOf(runId), run, recalculated, null);
    return recalculated;
  }

  private void raiseAnomalies(long runId, Employee employee, BigDecimal netPay, int overtimeMinutes, BigDecimal grossEarnings) {
    if (netPay.signum() < 0) {
      payrollAnomalyRepository.insert(runId, employee.id(), "NEGATIVE_NET_PAY", "CRITICAL",
          "Deductions exceed earnings for this employee.", "Review unpaid leave, tax and recurring deductions before publishing.", true);
    }
    if (!employee.bankVerified()) {
      payrollAnomalyRepository.insert(runId, employee.id(), "MISSING_BANK_DETAILS", "CRITICAL",
          "Bank account has not been verified for this employee.", "Verify bank details before publishing.", true);
    }
    if (!employee.taxIdVerified()) {
      payrollAnomalyRepository.insert(runId, employee.id(), "MISSING_TAX_DATA", "HIGH",
          "Tax identification has not been verified for this employee.", "Verify tax details before publishing.", true);
    }
    if (overtimeMinutes > UNUSUAL_OVERTIME_MINUTES) {
      payrollAnomalyRepository.insert(runId, employee.id(), "UNUSUAL_OVERTIME", "MEDIUM",
          "Overtime exceeds " + (UNUSUAL_OVERTIME_MINUTES / 60) + " hours for the period.",
          "Review attendance records and manager approval for this overtime.", false);
    }
    boolean hasPendingCorrection = attendanceCorrectionRepository
        .search("PENDING", employee.id(), null, null, 0, 1).total() > 0;
    if (hasPendingCorrection) {
      payrollAnomalyRepository.insert(runId, employee.id(), "PENDING_ATTENDANCE_CORRECTION", "LOW",
          "This employee has a pending attendance correction request.",
          "Resolve the correction request first; it may change unpaid-leave days.", false);
    }
    salaryStructureRepository.historyForEmployee(employee.id()).stream()
        .filter(s -> "SUPERSEDED".equals(s.status()))
        .findFirst()
        .ifPresent(previous -> {
          BigDecimal previousGross = previous.grossMonthly();
          if (previousGross.signum() <= 0) {
            return;
          }
          BigDecimal delta = grossEarnings.subtract(previousGross).abs();
          if (delta.divide(previousGross, 4, RoundingMode.HALF_UP).compareTo(SALARY_CHANGE_ALERT_RATIO) > 0) {
            payrollAnomalyRepository.insert(runId, employee.id(), "UNEXPECTED_SALARY_CHANGE", "HIGH",
                "Gross pay changed by more than " + SALARY_CHANGE_ALERT_RATIO.multiply(BigDecimal.valueOf(100)) + "% since the last salary structure.",
                "Confirm the salary structure change was intended before publishing.", false);
          }
        });
  }

  @Transactional
  public PayrollRun submitForReview(CurrentUser actor, long runId) {
    actor.require("payroll:manage");
    PayrollRun run = requireRun(runId);
    if (!"CALCULATED".equals(run.status())) {
      throw ApiException.conflict("Only a calculated run can be submitted for review.");
    }
    payrollRunRepository.markStatus(runId, "UNDER_REVIEW");
    PayrollRun after = requireRun(runId);
    auditService.record(actor.userId(), "SUBMIT_PAYROLL_FOR_REVIEW", "PayrollRun", String.valueOf(runId), run, after, null);
    return after;
  }

  @Transactional
  public PayrollRun approve(CurrentUser actor, long runId, ApprovePayrollRequest request) {
    actor.require("payroll:approve");
    PayrollRun run = requireRun(runId);
    if (!"UNDER_REVIEW".equals(run.status())) {
      throw ApiException.conflict("Only a run that is under review can be approved.");
    }
    Long calculatedBy = payrollRunRepository.calculatedByUserId(runId).orElse(null);
    if (calculatedBy != null && calculatedBy == actor.userId()) {
      throw ApiException.forbidden("You calculated this payroll run; a different Payroll Officer must approve it (maker-checker).");
    }
    payrollRunRepository.markApproved(runId, actor.userId(), request.reason());
    PayrollRun after = requireRun(runId);
    auditService.record(actor.userId(), "APPROVE_PAYROLL", "PayrollRun", String.valueOf(runId), run, after, request.reason());
    return after;
  }

  @Transactional
  public PayrollRun publish(CurrentUser actor, long runId) {
    actor.require("payroll:publish");
    PayrollRun run = requireRun(runId);
    if (!"APPROVED".equals(run.status())) {
      throw ApiException.conflict("Only an approved run can be published.");
    }
    int blocking = payrollAnomalyRepository.countOpenBlocking(runId);
    if (blocking > 0) {
      throw ApiException.conflict("Resolve " + blocking + " blocking anomaly(ies) before publishing.");
    }
    payrollRunRepository.markPublished(runId, actor.userId());
    PayrollRun after = requireRun(runId);
    auditService.record(actor.userId(), "PUBLISH_PAYROLL", "PayrollRun", String.valueOf(runId), run, after, null);

    for (PayrollLine line : payrollLineRepository.forRun(runId)) {
      userRepository.findByEmployeeId(line.employeeId()).ifPresent(account -> notificationService.notify(
          account.id(), "PAYROLL", "INFO", "Salary slip available",
          "Your salary slip for " + run.periodMonth() + " is now available.", "/payroll"));
    }
    return after;
  }

  @Transactional
  public PayrollRun markPaid(CurrentUser actor, long runId) {
    actor.require("payroll:publish");
    PayrollRun run = requireRun(runId);
    if (!"PUBLISHED".equals(run.status())) {
      throw ApiException.conflict("Only a published run can be marked paid.");
    }
    payrollRunRepository.markPaid(runId);
    PayrollRun after = requireRun(runId);
    auditService.record(actor.userId(), "MARK_PAYROLL_PAID", "PayrollRun", String.valueOf(runId), run, after, null);
    return after;
  }

  @Transactional
  public PayrollAnomaly resolveAnomaly(CurrentUser actor, long anomalyId, ResolveAnomalyRequest request) {
    actor.require("payroll:manage");
    PayrollAnomaly before = payrollAnomalyRepository.findById(anomalyId)
        .orElseThrow(() -> ApiException.notFound("Anomaly not found."));
    if (!List.of("ACKNOWLEDGED", "RESOLVED").contains(request.status())) {
      throw ApiException.badRequest("Status must be ACKNOWLEDGED or RESOLVED.");
    }
    payrollAnomalyRepository.resolve(anomalyId, request.status(), request.resolutionNote(), actor.userId());
    PayrollAnomaly after = payrollAnomalyRepository.findById(anomalyId).orElseThrow();
    auditService.record(actor.userId(), "RESOLVE_PAYROLL_ANOMALY", "PayrollAnomaly", String.valueOf(anomalyId), before, after, request.resolutionNote());
    return after;
  }

  public PageResponse<PayrollRun> list(CurrentUser actor, String status, int page, int size) {
    actor.require("payroll:read");
    return payrollRunRepository.search(status, page, size);
  }

  public PayrollRun get(CurrentUser actor, long runId) {
    actor.require("payroll:read");
    return requireRun(runId);
  }

  public List<PayrollLine> lines(CurrentUser actor, long runId) {
    actor.require("payroll:read");
    return payrollLineRepository.forRun(runId);
  }

  public List<PayrollAnomaly> anomalies(CurrentUser actor, long runId) {
    actor.require("payroll:read");
    return payrollAnomalyRepository.forRun(runId);
  }

  public List<PayrollLine> mySlips(CurrentUser actor) {
    actor.require("payroll:read:own");
    return payrollLineRepository.publishedSlipsForEmployee(actor.employeeId());
  }

  public List<PayrollLine> slipsForEmployee(CurrentUser actor, long employeeId) {
    if (!actor.has("payroll:read") && !(actor.has("payroll:read:own") && actor.employeeId() == employeeId)) {
      throw ApiException.forbidden("You do not have permission to view this employee's salary slips.");
    }
    return payrollLineRepository.publishedSlipsForEmployee(employeeId);
  }

  private PayrollRun requireRun(long id) {
    return payrollRunRepository.findById(id).orElseThrow(() -> ApiException.notFound("Payroll run not found."));
  }
}
