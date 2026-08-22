package com.dayflow.api.dashboard;

import com.dayflow.api.attendance.AttendanceCorrectionRepository;
import com.dayflow.api.attendance.AttendanceDayView;
import com.dayflow.api.attendance.AttendanceService;
import com.dayflow.api.audit.AuditLogEntry;
import com.dayflow.api.audit.AuditRepository;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.leave.LeaveRequest;
import com.dayflow.api.leave.LeaveRequestRepository;
import com.dayflow.api.security.CurrentUser;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Phase 1 + 2 are built (auth, directory, audit, attendance, leave, notifications). The
 * remaining KPI cards from spec section 4.2 (open tickets, onboarding progress, payroll
 * exceptions) are rendered with `available=false` and a note pointing at the phase that builds
 * them, rather than being faked — see spec section 22 ("meaningful empty states").
 */
@Service
public class DashboardService {
  private final EmployeeRepository employeeRepository;
  private final AuditRepository auditRepository;
  private final AttendanceService attendanceService;
  private final LeaveRequestRepository leaveRequestRepository;
  private final AttendanceCorrectionRepository attendanceCorrectionRepository;

  public DashboardService(EmployeeRepository employeeRepository, AuditRepository auditRepository,
      AttendanceService attendanceService, LeaveRequestRepository leaveRequestRepository,
      AttendanceCorrectionRepository attendanceCorrectionRepository) {
    this.employeeRepository = employeeRepository;
    this.auditRepository = auditRepository;
    this.attendanceService = attendanceService;
    this.leaveRequestRepository = leaveRequestRepository;
    this.attendanceCorrectionRepository = attendanceCorrectionRepository;
  }

  public DashboardSummary summary(CurrentUser actor) {
    actor.require("dashboard:read");
    boolean broadView = actor.has("employee:read");
    boolean canFollowUp = actor.has("employee:write");
    boolean canViewActivity = actor.has("audit:read");
    boolean canViewAttendanceAggregate = actor.has("attendance:read") || actor.has("attendance:read:reports");
    boolean canViewAvailability = actor.has("leave:read") || actor.has("leave:read:reports") || actor.has("leave:read:own");

    List<KpiCard> kpis = new ArrayList<>();
    if (broadView) {
      long active = employeeRepository.countByStatus("Active");
      long activeThirtyDaysAgo = employeeRepository.countActiveAsOf(LocalDate.now().minusDays(30));
      long delta = active - activeThirtyDaysAgo;
      String trendNote = delta == 0 ? "Flat vs. 30 days ago" : (delta > 0 ? "+" + delta + " vs. 30 days ago" : delta + " vs. 30 days ago");
      kpis.add(new KpiCard("activeEmployees", "Active employees", active, true, trendNote, "/employees?status=Active"));
    } else {
      kpis.add(new KpiCard("activeEmployees", "Active employees", null, false,
          "Visible to HR roles with directory access", null));
    }

    if (canViewAttendanceAggregate) {
      List<AttendanceDayView> today = attendanceService.today(actor, null);
      long present = today.stream().filter(d -> "Present".equals(d.status())).count();
      long absent = today.stream().filter(d -> "Absent".equals(d.status())).count();
      long onLeave = today.stream().filter(d -> "On Leave".equals(d.status())).count();
      long late = today.stream().filter(d -> d.lateMinutes() > 0).count();
      long total = today.size();
      kpis.add(new KpiCard("presentToday", "Present today", present, true,
          total == 0 ? "No active employees in scope" : Math.round(present * 100.0 / total) + "% of team", "/attendance?status=Present"));
      kpis.add(new KpiCard("absentOnLeave", "Absent / on leave", absent + onLeave, true,
          absent + " absent, " + onLeave + " on leave", "/attendance?status=Absent"));
      kpis.add(new KpiCard("lateArrivals", "Late arrivals", late, true, late > 0 ? "Needs review" : "On track", "/attendance?late=true"));
    } else {
      kpis.add(unavailable("presentToday", "Present today", "Visible to HR and Manager roles with attendance access"));
      kpis.add(unavailable("absentOnLeave", "Absent / on leave", "Visible to HR and Manager roles with attendance access"));
      kpis.add(unavailable("lateArrivals", "Late arrivals", "Visible to HR and Manager roles with attendance access"));
    }

    kpis.add(pendingApprovalsKpi(actor));
    kpis.add(unavailable("openTickets", "Open HR tickets", "Available once HR Help Desk ships (Phase 5)"));
    kpis.add(unavailable("onboardingProgress", "Onboarding progress", "Available once onboarding automation ships (Phase 3)"));
    kpis.add(unavailable("payrollExceptions", "Payroll exceptions", "Available once Payroll ships (Phase 4)"));

    List<DepartmentCount> departmentBreakdown = broadView
        ? employeeRepository.departmentBreakdown().stream().map(row -> new DepartmentCount((String) row[0], (Long) row[1])).toList()
        : List.of();

    List<AttentionItem> needsAttention = new ArrayList<>();
    if (canFollowUp) {
      needsAttention.addAll(employeeRepository.findNeedsOnboardingFollowUp(5).stream().map(this::toAttentionItem).toList());
    }
    if (actor.has("leave:approve")) {
      needsAttention.addAll(pendingLeaveForApprover(actor).stream().map(this::toAttentionItem).toList());
    }
    if (actor.has("attendance:approve_correction")) {
      needsAttention.addAll(pendingCorrectionCountItems(actor));
    }

    List<RecentActivityItem> recentActivity = canViewActivity
        ? auditRepository.search(null, null, null, 0, 6).items().stream().map(this::toActivityItem).toList()
        : List.of();

    List<UpcomingLeaveItem> upcomingLeave = canViewAvailability
        ? upcomingLeaveForActor(actor)
        : List.of();

    String firstName = actor.name() == null || actor.name().isBlank() ? "there" : actor.name().split(" ")[0];
    String greeting = String.format("%s, %s. %s", timeOfDayGreeting(), firstName, attentionSummary(needsAttention.size()));

    return new DashboardSummary(
        greeting,
        LocalDate.now().toString(),
        LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
        kpis,
        departmentBreakdown,
        canViewActivity,
        recentActivity,
        needsAttention,
        canViewAvailability,
        upcomingLeave);
  }

  private KpiCard pendingApprovalsKpi(CurrentUser actor) {
    boolean canApproveAnything = actor.has("leave:approve") || actor.has("attendance:approve_correction");
    if (!canApproveAnything) {
      return unavailable("pendingApprovals", "Pending approvals", "Visible to Managers and HR roles that approve requests");
    }
    long leavePending = actor.has("leave:approve") ? pendingLeaveCount(actor) : 0;
    long correctionPending = actor.has("attendance:approve_correction") ? pendingCorrectionsForApprover(actor) : 0;
    long total = leavePending + correctionPending;
    return new KpiCard("pendingApprovals", "Pending approvals", total, true,
        leavePending + " leave, " + correctionPending + " attendance correction(s)", "/leave?status=PENDING");
  }

  private List<LeaveRequest> pendingLeaveForApprover(CurrentUser actor) {
    if (actor.has("leave:read")) {
      return leaveRequestRepository.search("PENDING", null, null, null, 0, 5).items();
    }
    if (actor.has("leave:read:reports")) {
      return leaveRequestRepository.search("PENDING", null, actor.employeeId(), actor.employeeId(), 0, 5).items();
    }
    return List.of();
  }

  private long pendingLeaveCount(CurrentUser actor) {
    if (actor.has("leave:read")) {
      return leaveRequestRepository.search("PENDING", null, null, null, 0, 1).total();
    }
    if (actor.has("leave:read:reports")) {
      return leaveRequestRepository.search("PENDING", null, actor.employeeId(), actor.employeeId(), 0, 1).total();
    }
    return 0;
  }

  private long pendingCorrectionsForApprover(CurrentUser actor) {
    if (actor.has("attendance:read")) {
      return attendanceCorrectionRepository.search("PENDING", null, null, null, 0, 1).total();
    }
    return attendanceCorrectionRepository.search("PENDING", null, actor.employeeId(), actor.employeeId(), 0, 1).total();
  }

  private List<AttentionItem> pendingCorrectionCountItems(CurrentUser actor) {
    var corrections = actor.has("attendance:read")
        ? attendanceCorrectionRepository.search("PENDING", null, null, null, 0, 5).items()
        : attendanceCorrectionRepository.search("PENDING", null, actor.employeeId(), actor.employeeId(), 0, 5).items();
    return corrections.stream()
        .map(c -> new AttentionItem("Due Today", "Attendance correction pending",
            c.employeeName() + " requested a correction for " + c.workDate(), "Review", "/attendance/corrections",
            "AttendanceCorrection", c.id()))
        .toList();
  }

  private List<UpcomingLeaveItem> upcomingLeaveForActor(CurrentUser actor) {
    if (actor.has("leave:read")) {
      return leaveRequestRepository.findApprovedInRange(LocalDate.now(), LocalDate.now().plusDays(6), null, null)
          .stream().map(this::toUpcomingLeaveItem).toList();
    }
    if (actor.has("leave:read:reports")) {
      return leaveRequestRepository.findApprovedInRange(LocalDate.now(), LocalDate.now().plusDays(6), actor.employeeId(), actor.employeeId())
          .stream().map(this::toUpcomingLeaveItem).toList();
    }
    return leaveRequestRepository.findApprovedInRange(LocalDate.now(), LocalDate.now().plusDays(6), actor.employeeId(), null)
        .stream().map(this::toUpcomingLeaveItem).toList();
  }

  private UpcomingLeaveItem toUpcomingLeaveItem(LeaveRequest request) {
    return new UpcomingLeaveItem(request.employeeName(), request.leaveTypeName(), request.startDate().toString(), request.endDate().toString());
  }

  private KpiCard unavailable(String key, String label, String note) {
    return new KpiCard(key, label, null, false, note, null);
  }

  private AttentionItem toAttentionItem(Employee employee) {
    String detail = employee.name() + " (" + (employee.employeeCode() == null ? "no code yet" : employee.employeeCode()) + ") is still " + employee.status().toLowerCase() + ".";
    return new AttentionItem("Due Today", "Complete onboarding profile", detail, "Review", "/employees/" + employee.id(),
        "Employee", employee.id());
  }

  private AttentionItem toAttentionItem(LeaveRequest request) {
    return new AttentionItem("Due Today", "Leave approval pending",
        request.employeeName() + " requested " + request.days() + " day(s) of " + request.leaveTypeName(), "Review",
        "/leave?status=PENDING", "LeaveRequest", request.id());
  }

  private RecentActivityItem toActivityItem(AuditLogEntry entry) {
    return new RecentActivityItem(entry.actorName(), entry.action(), entry.entity(), entry.createdAt().toString());
  }

  private String timeOfDayGreeting() {
    int hour = LocalDateTime.now().getHour();
    if (hour < 12) {
      return "Good morning";
    }
    if (hour < 17) {
      return "Good afternoon";
    }
    return "Good evening";
  }

  private String attentionSummary(int count) {
    if (count == 0) {
      return "Nothing urgent is waiting on you right now.";
    }
    return count + (count == 1 ? " item needs" : " items need") + " your attention today.";
  }
}
