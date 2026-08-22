package com.dayflow.api.assistant;

import com.dayflow.api.attendance.AttendanceDayView;
import com.dayflow.api.attendance.AttendanceService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.leave.LeaveBalance;
import com.dayflow.api.leave.LeaveService;
import com.dayflow.api.payroll.PayrollLine;
import com.dayflow.api.payroll.PayrollRun;
import com.dayflow.api.payroll.PayrollRunRepository;
import com.dayflow.api.payroll.PayrollService;
import com.dayflow.api.policy.Policy;
import com.dayflow.api.policy.PolicyRepository;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.ticket.CreateTicketRequest;
import com.dayflow.api.ticket.HrTicket;
import com.dayflow.api.ticket.HrTicketService;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spec section 13: the self-service assistant is rule-based intent routing over the same
 * real leave/payroll/attendance/policy data the rest of the portal reads — there is no LLM
 * credential configured in this backend, so it never generates free-text answers. Every
 * question and answer is logged to `assistant_interactions` for HR to audit and improve
 * coverage, and anything it can't answer can be escalated straight into an HR ticket.
 */
@Service
public class AssistantService {
  private static final int HISTORY_LIMIT = 20;

  private final AssistantInteractionRepository interactionRepository;
  private final LeaveService leaveService;
  private final PayrollService payrollService;
  private final PayrollRunRepository payrollRunRepository;
  private final AttendanceService attendanceService;
  private final PolicyRepository policyRepository;
  private final HrTicketService ticketService;

  public AssistantService(AssistantInteractionRepository interactionRepository, LeaveService leaveService,
      PayrollService payrollService, PayrollRunRepository payrollRunRepository, AttendanceService attendanceService,
      PolicyRepository policyRepository, HrTicketService ticketService) {
    this.interactionRepository = interactionRepository;
    this.leaveService = leaveService;
    this.payrollService = payrollService;
    this.payrollRunRepository = payrollRunRepository;
    this.attendanceService = attendanceService;
    this.policyRepository = policyRepository;
    this.ticketService = ticketService;
  }

  @Transactional
  public AssistantInteraction ask(CurrentUser actor, AskRequest request) {
    actor.require("assistant:use");
    String question = request.question().trim();
    String lower = question.toLowerCase(Locale.ROOT);

    String intent;
    String answer;
    Long policyId = null;

    if (containsAny(lower, "policy", "policies", "code of conduct", "remote work")) {
      intent = "POLICY";
      Policy match = policyRepository.search(null, policyKeyword(lower)).stream().findFirst().orElse(null);
      if (match == null) {
        answer = "I couldn't find a policy matching that. Try asking about the leave policy, remote work policy, "
            + "attendance policy, or code of conduct — or raise a ticket and HR will help.";
      } else {
        policyId = match.id();
        answer = match.title() + ": " + truncate(match.body(), 500);
      }
    } else if (containsAny(lower, "salary", "payslip", "pay slip", "net pay", "ctc")) {
      intent = "SALARY_SLIP";
      answer = salaryAnswer(actor);
    } else if (containsAny(lower, "leave", "pto", "vacation", "time off", "days off")) {
      intent = "LEAVE_BALANCE";
      answer = leaveAnswer(actor);
    } else if (containsAny(lower, "attendance", "check in", "checked in", "check-in", "present", "absent")) {
      intent = "ATTENDANCE_STATUS";
      answer = attendanceAnswer(actor);
    } else {
      intent = "UNKNOWN";
      answer = "I'm not able to answer that yet — I can help with leave balances, salary slips, attendance, and "
          + "company policies. If you need a person, I can raise an HR ticket for you.";
    }

    long id = interactionRepository.create(actor.employeeId(), question, intent, answer, policyId, null);
    return interactionRepository.findById(id).orElseThrow();
  }

  @Transactional
  public AssistantInteraction escalate(CurrentUser actor, AssistantEscalateRequest request) {
    actor.require("assistant:use");
    actor.require("ticket:read:own");
    String subject = truncate(request.question(), 190);
    HrTicket ticket = ticketService.create(actor,
        new CreateTicketRequest(request.category(), subject, request.question(), request.confidential()));
    String answer = "I've raised HR ticket #" + ticket.id() + " (" + ticket.priority().toLowerCase(Locale.ROOT)
        + " priority) for you. HR will follow up soon.";
    long id = interactionRepository.create(actor.employeeId(), request.question(), "ESCALATION", answer, null,
        "TICKET_CREATED:" + ticket.id());
    return interactionRepository.findById(id).orElseThrow();
  }

  public List<AssistantInteraction> history(CurrentUser actor) {
    actor.require("assistant:use");
    return interactionRepository.history(actor.employeeId(), HISTORY_LIMIT);
  }

  private String salaryAnswer(CurrentUser actor) {
    try {
      List<PayrollLine> slips = payrollService.mySlips(actor);
      if (slips.isEmpty()) {
        return "You don't have any published salary slips yet.";
      }
      PayrollLine latest = slips.get(0);
      PayrollRun run = payrollRunRepository.findById(latest.payrollRunId()).orElse(null);
      String period = run == null ? "your latest pay run" : run.periodMonth();
      return "Your net pay for " + period + " was " + latest.netPay() + " (gross earnings " + latest.grossEarnings()
          + ", total deductions " + latest.totalDeductions() + "). You can view the full breakdown on the Payroll page.";
    } catch (ApiException ex) {
      return "I can't access your salary information right now — please check the Payroll page or contact HR.";
    }
  }

  private String leaveAnswer(CurrentUser actor) {
    try {
      List<LeaveBalance> balances = leaveService.balancesForEmployee(actor, actor.employeeId());
      if (balances.isEmpty()) {
        return "You don't have any leave balances set up yet — contact HR if you think this is a mistake.";
      }
      String summary = balances.stream()
          .map(b -> b.leaveTypeName() + ": " + b.balance() + " day(s)")
          .reduce((a, b) -> a + ", " + b)
          .orElse("");
      return "Your current leave balances are — " + summary + ".";
    } catch (ApiException ex) {
      return "I can't access your leave balance right now — please check the Leave page or contact HR.";
    }
  }

  private String attendanceAnswer(CurrentUser actor) {
    try {
      LocalDate today = LocalDate.now();
      LocalDate monthStart = today.withDayOfMonth(1);
      List<AttendanceDayView> days = attendanceService.forEmployee(actor, actor.employeeId(), monthStart, today);
      long present = days.stream().filter(d -> "Present".equals(d.status())).count();
      long absent = days.stream().filter(d -> "Absent".equals(d.status())).count();
      long onLeave = days.stream().filter(d -> "On Leave".equals(d.status())).count();
      AttendanceDayView todayView = days.stream().filter(d -> d.workDate().equals(today)).findFirst().orElse(null);
      String todayStatus = todayView == null ? "no record yet"
          : todayView.checkIn() == null ? "not checked in" : todayView.checkOut() == null ? "checked in, not checked out"
              : "checked in and out";
      return "Today you are " + todayStatus + ". This month so far: " + present + " day(s) present, " + absent
          + " absent, " + onLeave + " on leave.";
    } catch (ApiException ex) {
      return "I can't access your attendance record right now — please check the Attendance page or contact HR.";
    }
  }

  private boolean containsAny(String text, String... needles) {
    for (String needle : needles) {
      if (text.contains(needle)) {
        return true;
      }
    }
    return false;
  }

  private String policyKeyword(String lower) {
    if (lower.contains("remote")) {
      return "remote";
    }
    if (lower.contains("conduct")) {
      return "conduct";
    }
    if (lower.contains("attendance")) {
      return "attendance";
    }
    if (lower.contains("leave")) {
      return "leave";
    }
    return "";
  }

  private String truncate(String text, int max) {
    return text.length() <= max ? text : text.substring(0, max) + "...";
  }
}
