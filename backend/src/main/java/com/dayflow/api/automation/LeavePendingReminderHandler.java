package com.dayflow.api.automation;

import com.dayflow.api.approval.ApprovalRouter;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.leave.LeaveRequest;
import com.dayflow.api.leave.LeaveRequestRepository;
import com.dayflow.api.notification.NotificationService;
import com.dayflow.api.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Component;

/** Spec section 17.2: "Leave pending too long -> Remind approver; delegate or escalate."
 * Delegation isn't built (README limitation); this reminds the routed approver again after
 * {@code reminderAfterHours}, then escalates to every HR Admin/HR Officer after
 * {@code escalateAfterHours} if it's still untouched. Each nudge fires at most once per request,
 * tracked via leave_requests.reminder_sent_at / escalated_at. */
@Component
class LeavePendingReminderHandler implements AutomationHandler {
  private static final int DEFAULT_REMINDER_HOURS = 24;
  private static final int DEFAULT_ESCALATE_HOURS = 48;

  private final LeaveRequestRepository leaveRequestRepository;
  private final EmployeeRepository employeeRepository;
  private final ApprovalRouter approvalRouter;
  private final UserRepository userRepository;
  private final NotificationService notificationService;

  LeavePendingReminderHandler(LeaveRequestRepository leaveRequestRepository, EmployeeRepository employeeRepository,
      ApprovalRouter approvalRouter, UserRepository userRepository, NotificationService notificationService) {
    this.leaveRequestRepository = leaveRequestRepository;
    this.employeeRepository = employeeRepository;
    this.approvalRouter = approvalRouter;
    this.userRepository = userRepository;
    this.notificationService = notificationService;
  }

  @Override
  public String code() {
    return "LEAVE_PENDING_REMINDER";
  }

  @Override
  public HandlerResult run(JsonNode config, boolean dryRun) {
    int reminderAfterHours = intOrDefault(config, "reminderAfterHours", DEFAULT_REMINDER_HOURS);
    int escalateAfterHours = intOrDefault(config, "escalateAfterHours", DEFAULT_ESCALATE_HOURS);
    LocalDateTime now = LocalDateTime.now();

    List<LeaveRequest> needingReminder = leaveRequestRepository.findPendingNeedingReminder(now.minusHours(reminderAfterHours));
    List<LeaveRequest> needingEscalation = leaveRequestRepository.findPendingNeedingEscalation(now.minusHours(escalateAfterHours));

    int actions = 0;
    if (!dryRun) {
      for (LeaveRequest request : needingReminder) {
        Employee employee = employeeRepository.requireById(request.employeeId());
        for (Long userId : approvalRouter.routeApprovers(employee, "leave:approve")) {
          notificationService.notify(userId, "LEAVE", "WARNING", "Leave approval still pending",
              request.employeeName() + "'s " + request.leaveTypeName() + " request has been waiting since "
                  + request.createdAt().toLocalDate() + ".", "/leave?status=PENDING");
        }
        leaveRequestRepository.markReminderSent(request.id());
        actions++;
      }
      for (Long userId : userRepository.findUserIdsByRoles(List.of("HR_ADMIN", "HR_OFFICER"))) {
        for (LeaveRequest request : needingEscalation) {
          notificationService.notify(userId, "LEAVE", "CRITICAL", "Leave approval overdue — escalated",
              request.employeeName() + "'s " + request.leaveTypeName() + " request has been pending over "
                  + escalateAfterHours + " hours and needs attention.", "/leave?status=PENDING");
        }
      }
      for (LeaveRequest request : needingEscalation) {
        leaveRequestRepository.markEscalated(request.id());
        actions++;
      }
    }

    int matched = needingReminder.size() + needingEscalation.size();
    String detail = dryRun
        ? "Would remind " + needingReminder.size() + " approver(s) and escalate " + needingEscalation.size() + " request(s)."
        : "Reminded approvers for " + needingReminder.size() + " request(s); escalated " + needingEscalation.size() + " to HR.";
    return new HandlerResult(matched, actions, detail);
  }

  private int intOrDefault(JsonNode config, String field, int fallback) {
    if (config == null || !config.hasNonNull(field)) {
      return fallback;
    }
    return config.get(field).asInt(fallback);
  }
}
