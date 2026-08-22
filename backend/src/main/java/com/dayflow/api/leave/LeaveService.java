package com.dayflow.api.leave;

import com.dayflow.api.approval.ApprovalRouter;
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
import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Implements the spec's "Smart Approval" rule (section 8): a single working day off, with
 * sufficient balance, is low-risk enough to auto-approve. Everything else — multiple days,
 * insufficient balance, or an unpaid leave type — is routed to the employee's manager (falling
 * back to HR) for a human decision, and a human can always override an auto-approval afterward
 * by processing a cancellation.
 */
@Service
public class LeaveService {
  private static final BigDecimal AUTO_APPROVE_MAX_DAYS = BigDecimal.ONE;

  private final LeaveTypeRepository leaveTypeRepository;
  private final LeaveBalanceRepository leaveBalanceRepository;
  private final LeaveRequestRepository leaveRequestRepository;
  private final EmployeeRepository employeeRepository;
  private final AttendanceRepository attendanceRepository;
  private final WorkingDayCalculator workingDayCalculator;
  private final AuditService auditService;
  private final NotificationService notificationService;
  private final ApprovalRouter approvalRouter;
  private final UserRepository userRepository;

  public LeaveService(LeaveTypeRepository leaveTypeRepository, LeaveBalanceRepository leaveBalanceRepository,
      LeaveRequestRepository leaveRequestRepository, EmployeeRepository employeeRepository,
      AttendanceRepository attendanceRepository, WorkingDayCalculator workingDayCalculator, AuditService auditService,
      NotificationService notificationService, ApprovalRouter approvalRouter, UserRepository userRepository) {
    this.leaveTypeRepository = leaveTypeRepository;
    this.leaveBalanceRepository = leaveBalanceRepository;
    this.leaveRequestRepository = leaveRequestRepository;
    this.employeeRepository = employeeRepository;
    this.attendanceRepository = attendanceRepository;
    this.workingDayCalculator = workingDayCalculator;
    this.auditService = auditService;
    this.notificationService = notificationService;
    this.approvalRouter = approvalRouter;
    this.userRepository = userRepository;
  }

  public List<LeaveType> types() {
    return leaveTypeRepository.findAllActive();
  }

  public List<LeaveBalance> balancesForEmployee(CurrentUser actor, long employeeId) {
    Employee employee = employeeRepository.requireById(employeeId);
    assertCanView(actor, employee);
    return leaveBalanceRepository.forEmployee(employeeId);
  }

  @Transactional
  public LeaveRequest submit(CurrentUser actor, SubmitLeaveRequest request) {
    actor.require("leave:request");
    if (request.endDate().isBefore(request.startDate())) {
      throw ApiException.badRequest("End date must be on or after the start date.");
    }
    if (request.startDate().isBefore(LocalDate.now())) {
      throw ApiException.badRequest("Leave cannot be requested for a date in the past.");
    }
    LeaveType leaveType = leaveTypeRepository.findById(request.leaveTypeId())
        .filter(LeaveType::active)
        .orElseThrow(() -> ApiException.badRequest("Unknown or inactive leave type."));
    if (leaveRequestRepository.overlapExists(actor.employeeId(), request.startDate(), request.endDate())) {
      throw ApiException.conflict("You already have a pending or approved leave request that overlaps these dates.");
    }
    BigDecimal workingDays = BigDecimal.valueOf(workingDayCalculator.countWorkingDays(request.startDate(), request.endDate()));
    if (workingDays.signum() <= 0) {
      throw ApiException.badRequest("The selected range has no working days.");
    }
    if (leaveType.maxConsecutiveDays() != null && workingDays.compareTo(BigDecimal.valueOf(leaveType.maxConsecutiveDays())) > 0) {
      throw ApiException.badRequest("This leave type allows at most " + leaveType.maxConsecutiveDays() + " consecutive working days.");
    }

    BigDecimal balance = leaveType.paid()
        ? leaveBalanceRepository.findBalance(actor.employeeId(), leaveType.id()).orElse(BigDecimal.ZERO)
        : null;
    boolean sufficientBalance = !leaveType.paid() || balance.compareTo(workingDays) >= 0;
    boolean autoApprove = leaveType.requiresApproval()
        ? (workingDays.compareTo(AUTO_APPROVE_MAX_DAYS) <= 0 && sufficientBalance)
        : true;

    Employee employee = employeeRepository.requireById(actor.employeeId());
    long id = leaveRequestRepository.create(actor.employeeId(), leaveType.id(), request.startDate(), request.endDate(),
        workingDays, request.reason(), autoApprove ? "APPROVED" : "PENDING", null, autoApprove);
    LeaveRequest created = leaveRequestRepository.findById(id).orElseThrow();

    if (autoApprove) {
      applyApprovalEffects(employee, leaveType, request.startDate(), request.endDate(), workingDays);
      notificationService.notify(actor.userId(), "LEAVE", "INFO", "Leave auto-approved",
          "Your " + leaveType.name() + " request for " + request.startDate() + " was auto-approved.", "/leave");
      auditService.record(actor.userId(), "SUBMIT_LEAVE_REQUEST", "LeaveRequest", String.valueOf(id), null, created,
          "Auto-approved: single working day with sufficient balance");
    } else {
      auditService.record(actor.userId(), "SUBMIT_LEAVE_REQUEST", "LeaveRequest", String.valueOf(id), null, created, request.reason());
      List<Long> approvers = approvalRouter.routeApprovers(employee, "leave:approve");
      for (Long userId : approvers) {
        notificationService.notify(userId, "LEAVE", "INFO", "Leave request pending",
            employee.name() + " requested " + workingDays + " day(s) of " + leaveType.name(), "/leave/approvals");
      }
    }
    return created;
  }

  @Transactional
  public LeaveRequest decide(CurrentUser actor, long id, LeaveDecisionRequest request) {
    actor.require("leave:approve");
    LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
        .orElseThrow(() -> ApiException.notFound("Leave request not found."));
    if (!"PENDING".equals(leaveRequest.status())) {
      throw ApiException.conflict("This leave request has already been decided.");
    }
    Employee employee = employeeRepository.requireById(leaveRequest.employeeId());
    if (!actor.has("leave:read") && !Objects.equals(employee.managerId(), actor.employeeId())) {
      throw ApiException.forbidden("You can only decide leave requests for your direct reports.");
    }

    leaveRequestRepository.decide(id, request.approve(), request.reason(), actor.userId());
    if (request.approve()) {
      LeaveType leaveType = leaveTypeRepository.findById(leaveRequest.leaveTypeId()).orElseThrow();
      applyApprovalEffects(employee, leaveType, leaveRequest.startDate(), leaveRequest.endDate(), leaveRequest.days());
    }
    LeaveRequest decided = leaveRequestRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), request.approve() ? "APPROVE_LEAVE_REQUEST" : "REJECT_LEAVE_REQUEST",
        "LeaveRequest", String.valueOf(id), leaveRequest, decided, request.reason());

    userRepository.findByEmployeeId(leaveRequest.employeeId()).ifPresent(account -> notificationService.notify(
        account.id(), "LEAVE", request.approve() ? "INFO" : "WARNING",
        "Leave request " + (request.approve() ? "approved" : "rejected"),
        "Your " + leaveRequest.leaveTypeName() + " request for " + leaveRequest.startDate() + " was "
            + (request.approve() ? "approved." : "rejected: " + request.reason()), "/leave"));
    return decided;
  }

  @Transactional
  public LeaveRequest cancel(CurrentUser actor, long id, CancelLeaveRequest request) {
    actor.require("leave:cancel");
    LeaveRequest leaveRequest = leaveRequestRepository.findById(id)
        .orElseThrow(() -> ApiException.notFound("Leave request not found."));
    boolean isOwn = leaveRequest.employeeId() == actor.employeeId();
    if (!isOwn && !actor.has("leave:read")) {
      throw ApiException.forbidden("You can only cancel your own leave requests.");
    }
    if (!List.of("PENDING", "APPROVED").contains(leaveRequest.status())) {
      throw ApiException.conflict("Only pending or approved leave can be cancelled.");
    }
    if ("APPROVED".equals(leaveRequest.status()) && leaveRequest.startDate().isBefore(LocalDate.now())) {
      throw ApiException.badRequest("Cannot cancel leave that has already started.");
    }

    if ("APPROVED".equals(leaveRequest.status())) {
      LeaveType leaveType = leaveTypeRepository.findById(leaveRequest.leaveTypeId()).orElseThrow();
      if (leaveType.paid()) {
        leaveBalanceRepository.adjustBalance(leaveRequest.employeeId(), leaveType.id(), leaveRequest.days());
      }
      for (LocalDate date = leaveRequest.startDate(); !date.isAfter(leaveRequest.endDate()); date = date.plusDays(1)) {
        attendanceRepository.removeLeaveSyncedDay(leaveRequest.employeeId(), date);
      }
    }
    leaveRequestRepository.cancel(id);
    LeaveRequest cancelled = leaveRequestRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CANCEL_LEAVE_REQUEST", "LeaveRequest", String.valueOf(id), leaveRequest, cancelled, request.reason());
    return cancelled;
  }

  public PageResponse<LeaveRequest> search(CurrentUser actor, String status, Long employeeId, int page, int size) {
    if (actor.has("leave:read")) {
      return leaveRequestRepository.search(status, employeeId, null, null, page, size);
    }
    if (actor.has("leave:read:reports")) {
      return leaveRequestRepository.search(status, employeeId, actor.employeeId(), actor.employeeId(), page, size);
    }
    if (actor.has("leave:read:own")) {
      return leaveRequestRepository.search(status, actor.employeeId(), null, null, page, size);
    }
    throw ApiException.forbidden("You do not have permission to view leave requests.");
  }

  public List<LeaveRequest> teamAvailability(CurrentUser actor, int days) {
    LocalDate from = LocalDate.now();
    LocalDate to = from.plusDays(Math.max(days, 1) - 1L);
    if (actor.has("leave:read")) {
      return leaveRequestRepository.findApprovedInRange(from, to, null, null);
    }
    if (actor.has("leave:read:reports")) {
      return leaveRequestRepository.findApprovedInRange(from, to, actor.employeeId(), actor.employeeId());
    }
    if (actor.has("leave:read:own")) {
      return leaveRequestRepository.findApprovedInRange(from, to, actor.employeeId(), null);
    }
    return List.of();
  }

  private void applyApprovalEffects(Employee employee, LeaveType leaveType, LocalDate start, LocalDate end, BigDecimal days) {
    if (leaveType.paid()) {
      leaveBalanceRepository.adjustBalance(employee.id(), leaveType.id(), days.negate());
    }
    for (LocalDate date = start; !date.isAfter(end); date = date.plusDays(1)) {
      attendanceRepository.upsertLeaveDay(employee.id(), date);
    }
  }

  private void assertCanView(CurrentUser actor, Employee employee) {
    if (actor.has("leave:read") || actor.employeeId() == employee.id()) {
      return;
    }
    if (actor.has("leave:read:reports") && Objects.equals(employee.managerId(), actor.employeeId())) {
      return;
    }
    throw ApiException.forbidden("You do not have permission to view this employee's leave.");
  }
}
