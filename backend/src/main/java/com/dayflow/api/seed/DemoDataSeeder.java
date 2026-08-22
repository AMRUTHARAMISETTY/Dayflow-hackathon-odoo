package com.dayflow.api.seed;

import com.dayflow.api.attendance.AttendanceRepository;
import com.dayflow.api.department.DepartmentRepository;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.leave.LeaveBalanceRepository;
import com.dayflow.api.leave.LeaveRequestRepository;
import com.dayflow.api.leave.LeaveType;
import com.dayflow.api.leave.LeaveTypeRepository;
import com.dayflow.api.notification.NotificationRepository;
import com.dayflow.api.role.RoleRepository;
import com.dayflow.api.shift.ShiftRepository;
import com.dayflow.api.user.UserRepository;
import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds a demo organization (one person per role, plus one employee still mid-onboarding) so the
 * app is usable immediately after `docker compose up`. Passwords are hashed with the real
 * PasswordEncoder at startup rather than baked into SQL, and the whole thing is a no-op once any
 * user account exists so it never runs twice against the same database.
 *
 * Note: hradmin@dayflow.test, hrofficer@dayflow.test and auditor@dayflow.test are relied on by
 * name across the backend test suite (mine and other in-progress work in this repo) — please
 * keep those three accounts and their emails stable, or update the referencing tests in the same
 * change if they genuinely need to move.
 */
@Component
public class DemoDataSeeder implements CommandLineRunner {
  private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
  private static final String DEMO_PASSWORD = "Dayflow@123";

  private final JdbcTemplate jdbc;
  private final DepartmentRepository departmentRepository;
  private final EmployeeRepository employeeRepository;
  private final UserRepository userRepository;
  private final RoleRepository roleRepository;
  private final ShiftRepository shiftRepository;
  private final AttendanceRepository attendanceRepository;
  private final LeaveTypeRepository leaveTypeRepository;
  private final LeaveBalanceRepository leaveBalanceRepository;
  private final LeaveRequestRepository leaveRequestRepository;
  private final NotificationRepository notificationRepository;
  private final PasswordEncoder passwordEncoder;
  private final boolean seedEnabled;

  public DemoDataSeeder(JdbcTemplate jdbc, DepartmentRepository departmentRepository,
      EmployeeRepository employeeRepository, UserRepository userRepository, RoleRepository roleRepository,
      ShiftRepository shiftRepository, AttendanceRepository attendanceRepository, LeaveTypeRepository leaveTypeRepository,
      LeaveBalanceRepository leaveBalanceRepository, LeaveRequestRepository leaveRequestRepository,
      NotificationRepository notificationRepository, PasswordEncoder passwordEncoder,
      @Value("${dayflow.seed-demo-data:true}") boolean seedEnabled) {
    this.jdbc = jdbc;
    this.departmentRepository = departmentRepository;
    this.employeeRepository = employeeRepository;
    this.userRepository = userRepository;
    this.roleRepository = roleRepository;
    this.shiftRepository = shiftRepository;
    this.attendanceRepository = attendanceRepository;
    this.leaveTypeRepository = leaveTypeRepository;
    this.leaveBalanceRepository = leaveBalanceRepository;
    this.leaveRequestRepository = leaveRequestRepository;
    this.notificationRepository = notificationRepository;
    this.passwordEncoder = passwordEncoder;
    this.seedEnabled = seedEnabled;
  }

  @Override
  public void run(String... args) {
    if (!seedEnabled) {
      return;
    }
    Integer existingUsers = jdbc.queryForObject("select count(*) from users", Integer.class);
    if (existingUsers != null && existingUsers > 0) {
      return;
    }

    Long administration = departmentId("Administration");
    Long peopleOps = departmentId("People Operations");
    Long engineering = departmentId("Engineering");
    Long finance = departmentId("Finance");

    long superAdminId = seedPerson("Amrutha Ramisetty", "admin@dayflow.test", administration,
        "Super Administrator", null, "Bengaluru", "Full-time", LocalDate.now().minusDays(400), "SUPER_ADMIN");
    long hrAdminId = seedPerson("Priya Nair", "hradmin@dayflow.test", peopleOps, "HR Admin", null, "Bengaluru", "Full-time",
        LocalDate.now().minusDays(300), "HR_ADMIN");
    long hrOfficerId = seedPerson("Karan Bose", "hrofficer@dayflow.test", peopleOps, "HR Officer", null, "Bengaluru", "Full-time",
        LocalDate.now().minusDays(200), "HR_OFFICER");
    long payrollId = seedPerson("Kabir Shah", "payroll@dayflow.test", finance, "Payroll Officer", null, "Mumbai", "Full-time",
        LocalDate.now().minusDays(250), "PAYROLL_OFFICER");
    long managerId = seedPerson("Rohan Mehta", "manager@dayflow.test", engineering, "Engineering Manager", null,
        "Hyderabad", "Full-time", LocalDate.now().minusDays(500), "MANAGER");
    long employeeId = seedPerson("Dev Iyer", "employee@dayflow.test", engineering, "Frontend Engineer", managerId,
        "Hyderabad", "Full-time", LocalDate.now().minusDays(140), "EMPLOYEE");
    long auditorId = seedPerson("Nisha Rao", "auditor@dayflow.test", finance, "Internal Auditor", null, "Mumbai",
        "Full-time", LocalDate.now().minusDays(220), "AUDITOR");

    seedShiftsAndAttendance(managerId, employeeId);
    seedLeave(managerId, employeeId, payrollId, auditorId);
    seedPayroll(superAdminId, hrAdminId, hrOfficerId, managerId, employeeId, payrollId);
    jdbc.update("update automation_rules set owner_user_id = ?", superAdminId);

    jdbc.update("""
        insert into audit_logs(actor_user_id, action, entity, entity_id, reason, request_id)
        values (?, 'SEED_DEMO_DATA', 'System', 'demo', 'Initial Dayflow demo data', 'seed')
        """, superAdminId);

    log.info("Dayflow demo data seeded. Sign in as admin@dayflow.test / {}", DEMO_PASSWORD);
  }

  private void seedShiftsAndAttendance(long managerId, long employeeId) {
    long generalShiftId = shiftRepository.findAll().stream()
        .filter(s -> s.name().equals("General Shift")).findFirst().orElseThrow().id();
    shiftRepository.assignToEmployee(managerId, generalShiftId);
    shiftRepository.assignToEmployee(employeeId, generalShiftId);

    List<LocalDate> recentWeekdays = lastNWeekdays(4);
    // Dev Iyer: on time, then 15 minutes late, then 35 minutes of overtime, then on time again.
    attendanceRow(employeeId, recentWeekdays.get(3), LocalTime.of(8, 55), LocalTime.of(18, 0), 0, 0, 5);
    attendanceRow(employeeId, recentWeekdays.get(2), LocalTime.of(9, 25), LocalTime.of(18, 0), 15, 0, 0);
    attendanceRow(employeeId, recentWeekdays.get(1), LocalTime.of(9, 0), LocalTime.of(19, 30), 0, 0, 30);
    attendanceRow(employeeId, recentWeekdays.get(0), LocalTime.of(9, 5), LocalTime.of(18, 0), 0, 0, 0);

    // Rohan Mehta: one normal day, and one checked-in-but-never-checked-out day for the missing
    // checkout detector to pick up.
    attendanceRow(managerId, recentWeekdays.get(1), LocalTime.of(8, 50), LocalTime.of(18, 5), 0, 0, 0);
    jdbc.update("insert into attendance_records(employee_id, work_date, check_in, status) values (?, ?, ?, 'Present')",
        managerId, recentWeekdays.get(0), LocalDateTime.of(recentWeekdays.get(0), LocalTime.of(9, 2)));
  }

  private void seedLeave(long managerId, long employeeId, long payrollId, long auditorId) {
    LeaveType annual = leaveTypeRepository.findAllActive().stream().filter(t -> t.name().equals("Annual Leave")).findFirst().orElseThrow();
    LeaveType sick = leaveTypeRepository.findAllActive().stream().filter(t -> t.name().equals("Sick Leave")).findFirst().orElseThrow();

    for (long id : List.of(managerId, employeeId, payrollId, auditorId)) {
      leaveBalanceRepository.setBalance(id, annual.id(), new BigDecimal("18"));
      leaveBalanceRepository.setBalance(id, sick.id(), new BigDecimal("10"));
    }

    // Dev Iyer: a pending multi-day request, routed to his manager Rohan for approval.
    List<LocalDate> nextWeekdays = nextNWeekdays(3);
    long pendingId = leaveRequestRepository.create(employeeId, annual.id(), nextWeekdays.get(0),
        nextWeekdays.get(nextWeekdays.size() - 1), new BigDecimal(nextWeekdays.size()), "Family trip", "PENDING", null, false);
    userRepository.findByEmployeeId(managerId).ifPresent(manager -> notificationRepository.create(manager.id(), "LEAVE", "INFO",
        "Leave request pending", "Dev Iyer requested " + nextWeekdays.size() + " day(s) of Annual Leave", "/leave/approvals"));
    jdbc.update("insert into audit_logs(actor_user_id, action, entity, entity_id, reason, request_id) values (?,?,?,?,?,?)",
        userRepository.findByEmployeeId(employeeId).map(a -> a.id()).orElse(null), "SUBMIT_LEAVE_REQUEST", "LeaveRequest",
        String.valueOf(pendingId), "Family trip", "seed");

    // Kabir Shah: an already-approved single-day sick leave from earlier this week (auto-approved).
    LocalDate pastSickDay = lastNWeekdays(2).get(0);
    long approvedId = leaveRequestRepository.create(payrollId, sick.id(), pastSickDay, pastSickDay, BigDecimal.ONE,
        "Not feeling well", "APPROVED", null, true);
    leaveBalanceRepository.adjustBalance(payrollId, sick.id(), BigDecimal.ONE.negate());
    attendanceRepository.upsertLeaveDay(payrollId, pastSickDay);
    jdbc.update("insert into audit_logs(actor_user_id, action, entity, entity_id, reason, request_id) values (?,?,?,?,?,?)",
        userRepository.findByEmployeeId(payrollId).map(a -> a.id()).orElse(null), "SUBMIT_LEAVE_REQUEST", "LeaveRequest",
        String.valueOf(approvedId), "Auto-approved: single working day with sufficient balance", "seed");
  }

  /** Verifies bank/tax details and gives everyone but the auditor a salary structure, so a demo
   * payroll run has both clean lines and a real, honest blocking anomaly (missing salary
   * structure + unverified bank/tax) to review rather than starting from an all-green state. */
  private void seedPayroll(long superAdminId, long hrAdminId, long hrOfficerId, long managerId, long employeeId, long payrollId) {
    java.util.Map<Long, BigDecimal[]> structures = java.util.Map.of(
        superAdminId, new BigDecimal[] {new BigDecimal("180000"), new BigDecimal("36000"), new BigDecimal("20000")},
        hrAdminId, new BigDecimal[] {new BigDecimal("95000"), new BigDecimal("19000"), new BigDecimal("8000")},
        hrOfficerId, new BigDecimal[] {new BigDecimal("60000"), new BigDecimal("12000"), new BigDecimal("5000")},
        managerId, new BigDecimal[] {new BigDecimal("140000"), new BigDecimal("28000"), new BigDecimal("15000")},
        employeeId, new BigDecimal[] {new BigDecimal("75000"), new BigDecimal("15000"), new BigDecimal("6000")},
        payrollId, new BigDecimal[] {new BigDecimal("70000"), new BigDecimal("14000"), new BigDecimal("6000")});

    structures.forEach((id, amounts) -> {
      employeeRepository.setPayrollVerificationFlags(id, true, true);
      jdbc.update("""
          insert into salary_structures(employee_id, effective_from, basic_monthly, hra_monthly, allowances_monthly,
                                         recurring_deductions_monthly, reason, created_by_user_id)
          values (?, ?, ?, ?, ?, ?, ?, ?)
          """, id, LocalDate.now().minusDays(180), amounts[0], amounts[1], amounts[2], BigDecimal.ZERO,
          "Initial demo salary structure", superAdminId);
    });
  }

  private void attendanceRow(long employeeId, LocalDate date, LocalTime checkIn, LocalTime checkOut, int lateMinutes,
      int earlyMinutes, int overtimeMinutes) {
    jdbc.update("""
        insert into attendance_records(employee_id, work_date, check_in, check_out, status, late_minutes,
                                        early_departure_minutes, overtime_minutes)
        values (?, ?, ?, ?, 'Present', ?, ?, ?)
        """, employeeId, date, LocalDateTime.of(date, checkIn), LocalDateTime.of(date, checkOut), lateMinutes, earlyMinutes, overtimeMinutes);
  }

  private List<LocalDate> lastNWeekdays(int n) {
    java.util.ArrayList<LocalDate> days = new java.util.ArrayList<>();
    LocalDate cursor = LocalDate.now().minusDays(1);
    while (days.size() < n) {
      if (cursor.getDayOfWeek() != DayOfWeek.SATURDAY && cursor.getDayOfWeek() != DayOfWeek.SUNDAY) {
        days.add(cursor);
      }
      cursor = cursor.minusDays(1);
    }
    return days;
  }

  private List<LocalDate> nextNWeekdays(int n) {
    java.util.ArrayList<LocalDate> days = new java.util.ArrayList<>();
    LocalDate cursor = LocalDate.now().plusDays(1);
    while (days.size() < n) {
      if (cursor.getDayOfWeek() != DayOfWeek.SATURDAY && cursor.getDayOfWeek() != DayOfWeek.SUNDAY) {
        days.add(cursor);
      }
      cursor = cursor.plusDays(1);
    }
    return days;
  }

  private long seedPerson(String name, String email, Long departmentId, String designation, Long managerId,
      String location, String employmentType, LocalDate joiningDate, String roleName) {
    long employeeId = employeeRepository.create(name, email, null, departmentId, designation, managerId, location,
        employmentType, "Active", joiningDate);
    long roleId = roleRepository.idByName(roleName);
    long userId = userRepository.create(employeeId, email, passwordEncoder.encode(DEMO_PASSWORD), roleId);
    employeeRepository.insertJobHistory(employeeId, departmentId, designation, managerId, employmentType, "Active",
        joiningDate, "CREATED", "Seeded demo account", userId);
    return employeeId;
  }

  private Long departmentId(String name) {
    return departmentRepository.findAll().stream()
        .filter(d -> d.name().equals(name))
        .findFirst()
        .map(com.dayflow.api.department.Department::id)
        .orElseThrow(() -> new IllegalStateException("Reference data missing department: " + name));
  }
}
