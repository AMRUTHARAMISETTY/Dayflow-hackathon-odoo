package com.dayflow.api;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.filter.OncePerRequestFilter;

@SpringBootApplication
public class DayflowApiApplication {
  public static void main(String[] args) {
    SpringApplication.run(DayflowApiApplication.class, args);
  }

  @Bean PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }
}

@EnableWebSecurity
@Configuration
class SecurityConfig {
  @Bean
  SecurityFilterChain securityFilterChain(HttpSecurity http, TokenFilter tokenFilter) throws Exception {
    return http.csrf(csrf -> csrf.disable())
      .authorizeHttpRequests(auth -> auth
        .requestMatchers("/api/auth/login", "/api/auth/register", "/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/h2-console/**").permitAll()
        .anyRequest().authenticated())
      .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
      .httpBasic(basic -> basic.disable())
      .formLogin(form -> form.disable())
      .addFilterBefore(tokenFilter, UsernamePasswordAuthenticationFilter.class)
      .build();
  }
}

@Component
class TokenFilter extends OncePerRequestFilter {
  private final HrRepository repo;
  TokenFilter(HrRepository repo) { this.repo = repo; }
  @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
      throws ServletException, IOException {
    String header = req.getHeader("Authorization");
    if (header != null && header.startsWith("Bearer dayflow-dev-")) {
      try {
        long userId = Long.parseLong(header.substring("Bearer dayflow-dev-".length()));
        AppUser user = repo.findUserById(userId).orElseThrow();
        List<GrantedAuthority> auths = user.permissions().stream().map(SimpleGrantedAuthority::new).map(a -> (GrantedAuthority) a).toList();
        Authentication auth = new UsernamePasswordAuthenticationToken(user, null, auths);
        SecurityContextHolder.getContext().setAuthentication(auth);
      } catch (RuntimeException ignored) {
        SecurityContextHolder.clearContext();
      }
    }
    chain.doFilter(req, res);
  }
}

@RestController
@RequestMapping("/api/auth")
class AuthController {
  private final HrService service;
  AuthController(HrService service) { this.service = service; }

  @PostMapping("/login")
  AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
    return service.login(request, servletRequest.getRemoteAddr());
  }

  @PostMapping("/register")
  ResponseEntity<ApiResponse<Map<String, Object>>> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.registerEmployeeOnly(request, servletRequest.getRemoteAddr())));
  }

  @GetMapping("/me")
  ApiResponse<AppUser> me(Authentication auth) {
    return ApiResponse.ok((AppUser) auth.getPrincipal());
  }
}

@RestController
@RequestMapping("/api/hr")
@CrossOrigin
class HrController {
  private final HrService service;
  HrController(HrService service) { this.service = service; }

  @GetMapping("/dashboard")
  ApiResponse<Dashboard> dashboard(Authentication auth, @RequestParam(defaultValue = "30") int days,
      @RequestParam(required = false) String department, @RequestParam(required = false) String location) {
    return ApiResponse.ok(service.dashboard(user(auth), days, department, location));
  }

  @GetMapping("/employees")
  ApiResponse<Page<EmployeeRow>> employees(Authentication auth, @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "") String department, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "10") int size) {
    return ApiResponse.ok(service.employees(user(auth), q, department, page, size));
  }

  @PostMapping("/employees")
  ResponseEntity<ApiResponse<EmployeeRow>> addEmployee(Authentication auth, @Valid @RequestBody EmployeeCreate request,
      HttpServletRequest servletRequest) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.addEmployee(user(auth), request, servletRequest.getRemoteAddr())));
  }

  @PostMapping("/employees/{id}/invite")
  ApiResponse<NotificationRow> invite(Authentication auth, @PathVariable long id, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.inviteEmployee(user(auth), id, servletRequest.getRemoteAddr()));
  }

  @GetMapping("/approvals")
  ApiResponse<List<LeaveRequestRow>> approvals(Authentication auth) {
    return ApiResponse.ok(service.approvals(user(auth)));
  }

  @PostMapping("/leave/{id}/decision")
  ApiResponse<LeaveRequestRow> decideLeave(Authentication auth, @PathVariable long id, @Valid @RequestBody LeaveDecision decision,
      HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.decideLeave(user(auth), id, decision, servletRequest.getRemoteAddr()));
  }

  @GetMapping("/payroll/anomalies")
  ApiResponse<List<PayrollAnomaly>> anomalies(Authentication auth) {
    return ApiResponse.ok(service.payrollAnomalies(user(auth)));
  }

  @PostMapping("/email/send")
  ApiResponse<EmailMessage> sendEmail(Authentication auth, @Valid @RequestBody EmailSend request,
      @RequestHeader(name = "Idempotency-Key", required = false) String key, HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.sendEmail(user(auth), request, Optional.ofNullable(key).orElse(UUID.randomUUID().toString()), servletRequest.getRemoteAddr()));
  }

  @GetMapping("/tickets")
  ApiResponse<List<TicketRow>> tickets(Authentication auth) {
    return ApiResponse.ok(service.tickets(user(auth)));
  }

  @GetMapping("/automation-rules")
  ApiResponse<List<AutomationRule>> rules(Authentication auth) {
    return ApiResponse.ok(service.rules(user(auth)));
  }

  @PutMapping("/automation-rules/{id}/toggle")
  ApiResponse<AutomationRule> toggleRule(Authentication auth, @PathVariable long id, @Valid @RequestBody RuleToggle request,
      HttpServletRequest servletRequest) {
    return ApiResponse.ok(service.toggleRule(user(auth), id, request, servletRequest.getRemoteAddr()));
  }

  @GetMapping("/audit-logs")
  ApiResponse<List<AuditLog>> audit(Authentication auth) {
    return ApiResponse.ok(service.auditLogs(user(auth)));
  }

  private AppUser user(Authentication auth) { return (AppUser) auth.getPrincipal(); }
}

@Service
class HrService {
  private final HrRepository repo;
  private final PasswordEncoder encoder;
  HrService(HrRepository repo, PasswordEncoder encoder) { this.repo = repo; this.encoder = encoder; }

  AuthResponse login(LoginRequest request, String ip) {
    AppUser user = repo.findUserByEmail(request.email()).orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));
    if (!encoder.matches(request.password(), user.passwordHash())) throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
    repo.audit(user.id(), "LOGIN", "User", String.valueOf(user.id()), null, "Successful login", "Credential login", ip);
    return new AuthResponse("dayflow-dev-" + user.id(), user.withoutPassword());
  }

  @Transactional
  Map<String, Object> registerEmployeeOnly(RegisterRequest request, String ip) {
    if (!request.role().equals("Employee")) throw new ApiException(HttpStatus.BAD_REQUEST, "Public registration is limited to Employee accounts.");
    long roleId = repo.roleId("Employee");
    long id = repo.createUser(request.name(), request.email(), encoder.encode(request.password()), roleId);
    repo.audit(id, "REGISTER_EMPLOYEE", "User", String.valueOf(id), null, request.email(), "Public employee registration", ip);
    return Map.of("id", id, "message", "Employee account created. HR activation is required before sensitive workflows are available.");
  }

  Dashboard dashboard(AppUser user, int days, String department, String location) {
    require(user, "dashboard:read");
    return repo.dashboard(days, department, location);
  }

  Page<EmployeeRow> employees(AppUser user, String q, String department, int page, int size) {
    require(user, "employee:read");
    return repo.employees(q, department, Math.max(0, page), Math.min(Math.max(1, size), 50));
  }

  EmployeeRow addEmployee(AppUser user, EmployeeCreate request, String ip) {
    require(user, "employee:write");
    EmployeeRow row = repo.addEmployee(request);
    repo.audit(user.id(), "CREATE_EMPLOYEE", "Employee", String.valueOf(row.id()), null, row.email(), "HR employee creation", ip);
    return row;
  }

  NotificationRow inviteEmployee(AppUser user, long employeeId, String ip) {
    require(user, "employee:write");
    NotificationRow notification = repo.createNotification(user.id(), "Invitation queued", "A secure onboarding invitation was queued for employee #" + employeeId, "INFO");
    repo.audit(user.id(), "SEND_INVITATION", "Employee", String.valueOf(employeeId), null, "Invitation queued", "Manual HR invite", ip);
    return notification;
  }

  List<LeaveRequestRow> approvals(AppUser user) {
    require(user, "approval:read");
    return repo.leaveRequests();
  }

  @Transactional
  LeaveRequestRow decideLeave(AppUser user, long id, LeaveDecision decision, String ip) {
    require(user, "approval:decide");
    if (decision.decision().equals("REJECTED") && (decision.reason() == null || decision.reason().isBlank())) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "A rejection reason is required.");
    }
    LeaveRequestRow before = repo.leaveRequest(id);
    LeaveRequestRow after = repo.updateLeaveDecision(id, decision);
    repo.audit(user.id(), "LEAVE_" + decision.decision(), "LeaveRequest", String.valueOf(id), before.status(), after.status(), decision.reason(), ip);
    return after;
  }

  List<PayrollAnomaly> payrollAnomalies(AppUser user) {
    require(user, "payroll:read");
    return repo.payrollAnomalies();
  }

  EmailMessage sendEmail(AppUser user, EmailSend request, String idempotencyKey, String ip) {
    require(user, request.sendNow() ? "email:send" : "email:write");
    if (request.recipients().size() > 10 && !request.bulkConfirmed()) {
      throw new ApiException(HttpStatus.BAD_REQUEST, "Bulk email requires explicit recipient confirmation.");
    }
    EmailMessage message = repo.createEmail(user.id(), request);
    repo.audit(user.id(), request.sendNow() ? "SEND_EMAIL" : "SCHEDULE_EMAIL", "EmailMessage", String.valueOf(message.id()), null, message.status(), idempotencyKey, ip);
    return message;
  }

  List<TicketRow> tickets(AppUser user) {
    require(user, "ticket:read");
    return repo.tickets(user.permissions().contains("ticket:confidential"));
  }

  List<AutomationRule> rules(AppUser user) {
    require(user, "automation:read");
    return repo.rules();
  }

  AutomationRule toggleRule(AppUser user, long id, RuleToggle request, String ip) {
    require(user, "automation:write");
    AutomationRule existing = repo.rule(id);
    if (existing.highRisk() && !request.confirmed()) throw new ApiException(HttpStatus.BAD_REQUEST, "High-risk automation changes require confirmation.");
    AutomationRule updated = repo.toggleRule(id, request.active());
    repo.audit(user.id(), "TOGGLE_AUTOMATION", "AutomationRule", String.valueOf(id), String.valueOf(existing.active()), String.valueOf(updated.active()), request.reason(), ip);
    return updated;
  }

  List<AuditLog> auditLogs(AppUser user) {
    require(user, "audit:read");
    return repo.auditLogs();
  }

  private void require(AppUser user, String permission) {
    if (!user.permissions().contains(permission)) throw new ApiException(HttpStatus.FORBIDDEN, "You do not have permission to perform this action.");
  }
}

@Component
class HrRepository {
  private final JdbcTemplate jdbc;
  HrRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  Optional<AppUser> findUserById(long id) {
    return queryUser("where u.id = ?", id);
  }

  Optional<AppUser> findUserByEmail(String email) {
    return queryUser("where lower(u.email)=lower(?)", email);
  }

  private Optional<AppUser> queryUser(String where, Object value) {
    try {
      AppUser base = jdbc.queryForObject("""
        select u.id, u.name, u.email, u.password_hash, r.name role_name
        from users u join roles r on r.id = u.role_id %s and u.active = true
        """.formatted(where), (rs, row) -> new AppUser(rs.getLong("id"), rs.getString("name"), rs.getString("email"), rs.getString("password_hash"), rs.getString("role_name"), List.of()), value);
      List<String> permissions = jdbc.queryForList("""
        select p.code from permissions p
        join role_permissions rp on rp.permission_id = p.id
        join users u on u.role_id = rp.role_id
        where u.id = ? order by p.code
        """, String.class, base.id());
      return Optional.of(new AppUser(base.id(), base.name(), base.email(), base.passwordHash(), base.role(), permissions));
    } catch (EmptyResultDataAccessException ex) {
      return Optional.empty();
    }
  }

  long roleId(String role) {
    return jdbc.queryForObject("select id from roles where name = ?", Long.class, role);
  }

  long createUser(String name, String email, String passwordHash, long roleId) {
    KeyHolder keys = new GeneratedKeyHolder();
    jdbc.update(connection -> {
      var ps = connection.prepareStatement("insert into users(name,email,password_hash,role_id) values(?,?,?,?)", new String[] {"id"});
      ps.setString(1, name);
      ps.setString(2, email);
      ps.setString(3, passwordHash);
      ps.setLong(4, roleId);
      return ps;
    }, keys);
    return keys.getKey().longValue();
  }

  Dashboard dashboard(int days, String department, String location) {
    String filter = " where (? is null or d.name = ?) and (? is null or e.location = ?) ";
    Object[] args = blankToNulls(department, location);
    int total = jdbc.queryForObject("select count(*) from employees e join departments d on d.id=e.department_id" + filter + " and e.status='Active'", Integer.class, args);
    int present = jdbc.queryForObject("select count(*) from attendance a join employees e on e.id=a.employee_id join departments d on d.id=e.department_id" + filter + " and a.work_date=current_date and a.status='Present'", Integer.class, args);
    int absent = jdbc.queryForObject("select count(*) from attendance a join employees e on e.id=a.employee_id join departments d on d.id=e.department_id" + filter + " and a.work_date=current_date and a.status='Absent'", Integer.class, args);
    int leave = jdbc.queryForObject("select count(*) from leave_requests l join employees e on e.id=l.employee_id join departments d on d.id=e.department_id" + filter + " and current_date between l.start_date and l.end_date and l.status='APPROVED'", Integer.class, args);
    int late = jdbc.queryForObject("select count(*) from attendance a join employees e on e.id=a.employee_id join departments d on d.id=e.department_id" + filter + " and a.work_date=current_date and a.late_minutes > 0", Integer.class, args);
    int approvals = jdbc.queryForObject("select count(*) from leave_requests where status='PENDING'", Integer.class);
    int tickets = jdbc.queryForObject("select count(*) from hr_tickets where status not in ('Resolved','Closed')", Integer.class);
    int payroll = jdbc.queryForObject("select count(*) from payroll_anomalies where review_status='OPEN'", Integer.class);
    List<Kpi> kpis = List.of(
      new Kpi("Total active employees", total, "+4.2%", "up", "/employees?status=Active"),
      new Kpi("Present today", present, "+2 vs yesterday", "up", "/attendance?status=Present"),
      new Kpi("Absent today", absent, "-1 vs yesterday", "down", "/attendance?status=Absent"),
      new Kpi("Employees on leave", leave, "Steady", "flat", "/leave?status=Approved"),
      new Kpi("Late arrivals", late, "Needs review", late > 0 ? "up" : "flat", "/attendance?late=true"),
      new Kpi("Pending approvals", approvals, "Due today", approvals > 0 ? "up" : "flat", "/approvals"),
      new Kpi("Open HR tickets", tickets, "SLA tracked", tickets > 0 ? "up" : "flat", "/tickets"),
      new Kpi("Payroll exceptions", payroll, "Blocks publish", payroll > 0 ? "up" : "flat", "/payroll/anomalies")
    );
    List<ActionItem> actions = jdbc.query("""
      select 'Critical' severity, 'Payroll anomaly review' title, pa.issue detail, 'Review' action
      from payroll_anomalies pa where pa.review_status='OPEN'
      union all
      select 'Due today', 'Leave approval pending', e.name || ' requested ' || l.leave_type, 'Approve'
      from leave_requests l join employees e on e.id=l.employee_id where l.status='PENDING'
      union all
      select case when confidential then 'Critical' else 'Upcoming' end, 'HR ticket SLA', subject, 'Assign'
      from hr_tickets where status not in ('Resolved','Closed')
      limit 8
      """, (rs, row) -> new ActionItem(rs.getString(1), rs.getString(2), rs.getString(3), rs.getString(4)));
    return new Dashboard("Good morning, Amrutha. Here is what needs your attention today.", "Dayflow", LocalDate.now().toString(), Instant.now().truncatedTo(ChronoUnit.SECONDS).toString(), kpis, actions, workforceTrend(), recentActivity());
  }

  Page<EmployeeRow> employees(String q, String department, int page, int size) {
    String like = "%" + q.toLowerCase() + "%";
    String dept = department == null || department.isBlank() ? null : department;
    List<EmployeeRow> rows = jdbc.query("""
      select e.id, e.employee_code, e.name, e.email, d.name department, p.title position, e.location, e.status, e.joining_date, e.bank_verified
      from employees e join departments d on d.id=e.department_id join positions p on p.id=e.position_id
      where (? is null or d.name = ?) and (lower(e.name) like ? or lower(e.email) like ? or lower(e.employee_code) like ?)
      order by e.name limit ? offset ?
      """, this::employeeRow, dept, dept, like, like, like, size, page * size);
    int total = jdbc.queryForObject("""
      select count(*) from employees e join departments d on d.id=e.department_id
      where (? is null or d.name = ?) and (lower(e.name) like ? or lower(e.email) like ? or lower(e.employee_code) like ?)
      """, Integer.class, dept, dept, like, like, like);
    return new Page<>(rows, page, size, total);
  }

  EmployeeRow addEmployee(EmployeeCreate request) {
    Long departmentId = jdbc.queryForObject("select id from departments where name=?", Long.class, request.department());
    Long positionId = jdbc.queryForObject("select id from positions where title=?", Long.class, request.position());
    jdbc.update("""
      insert into employees(employee_code,name,email,department_id,position_id,location,employment_type,status,joining_date,salary,bank_verified)
      values(?,?,?,?,?,?,?,?,?,?,?)
      """, request.employeeCode(), request.name(), request.email(), departmentId, positionId, request.location(), request.employmentType(), "Onboarding", request.joiningDate(), request.salary(), false);
    Long id = jdbc.queryForObject("select id from employees where employee_code=?", Long.class, request.employeeCode());
    return jdbc.queryForObject("""
      select e.id, e.employee_code, e.name, e.email, d.name department, p.title position, e.location, e.status, e.joining_date, e.bank_verified
      from employees e join departments d on d.id=e.department_id join positions p on p.id=e.position_id where e.id=?
      """, this::employeeRow, id);
  }

  List<LeaveRequestRow> leaveRequests() {
    return jdbc.query("""
      select l.id, e.name employee, l.leave_type, l.start_date, l.end_date, l.working_days, l.status, l.reason,
      coalesce((select balance from leave_balances b where b.employee_id=l.employee_id and b.leave_type=l.leave_type), 0) balance
      from leave_requests l join employees e on e.id=l.employee_id order by l.created_at desc
      """, this::leaveRow);
  }

  LeaveRequestRow leaveRequest(long id) {
    return jdbc.queryForObject("""
      select l.id, e.name employee, l.leave_type, l.start_date, l.end_date, l.working_days, l.status, l.reason,
      coalesce((select balance from leave_balances b where b.employee_id=l.employee_id and b.leave_type=l.leave_type), 0) balance
      from leave_requests l join employees e on e.id=l.employee_id where l.id=?
      """, this::leaveRow, id);
  }

  LeaveRequestRow updateLeaveDecision(long id, LeaveDecision decision) {
    jdbc.update("update leave_requests set status=?, rejection_reason=? where id=?", decision.decision(), decision.reason(), id);
    return leaveRequest(id);
  }

  List<PayrollAnomaly> payrollAnomalies() {
    return jdbc.query("""
      select pa.id, e.name employee, pa.issue, pa.severity, pa.possible_cause, pa.recommended_action, pa.review_status
      from payroll_anomalies pa join employees e on e.id=pa.employee_id order by case pa.severity when 'Critical' then 1 when 'High' then 2 else 3 end
      """, (rs, row) -> new PayrollAnomaly(rs.getLong("id"), rs.getString("employee"), rs.getString("issue"), rs.getString("severity"), rs.getString("possible_cause"), rs.getString("recommended_action"), rs.getString("review_status")));
  }

  EmailMessage createEmail(long userId, EmailSend request) {
    String status = request.sendNow() ? "Queued" : "Scheduled";
    jdbc.update("insert into email_messages(sender_user_id,subject,body,recipients,status,scheduled_at) values(?,?,?,?,?,?)",
      userId, request.subject(), request.body(), String.join(",", request.recipients()), status, request.scheduledAt());
    Long id = jdbc.queryForObject("select max(id) from email_messages", Long.class);
    return new EmailMessage(id, request.subject(), request.recipients(), status, request.scheduledAt());
  }

  List<TicketRow> tickets(boolean includeConfidential) {
    return jdbc.query("""
      select t.id, e.name employee, t.category, t.subject, t.status, t.priority, t.confidential, t.sla_due_at
      from hr_tickets t join employees e on e.id=t.employee_id
      where (? = true or t.confidential = false) order by t.sla_due_at
      """, (rs, row) -> new TicketRow(rs.getLong("id"), rs.getString("employee"), rs.getString("category"), rs.getString("subject"), rs.getString("status"), rs.getString("priority"), rs.getBoolean("confidential"), rs.getTimestamp("sla_due_at").toLocalDateTime()), includeConfidential);
  }

  List<AutomationRule> rules() {
    return jdbc.query("select * from automation_rules order by id", this::ruleRow);
  }

  AutomationRule rule(long id) {
    return jdbc.queryForObject("select * from automation_rules where id=?", this::ruleRow, id);
  }

  AutomationRule toggleRule(long id, boolean active) {
    jdbc.update("update automation_rules set active=? where id=?", active, id);
    return rule(id);
  }

  NotificationRow createNotification(long userId, String title, String body, String severity) {
    jdbc.update("insert into notifications(user_id,title,body,severity) values(?,?,?,?)", userId, title, body, severity);
    Long id = jdbc.queryForObject("select max(id) from notifications", Long.class);
    return new NotificationRow(id, title, body, severity);
  }

  void audit(Long actor, String action, String entity, String entityId, String previous, String next, String reason, String ip) {
    jdbc.update("insert into audit_logs(actor_user_id,action,entity,entity_id,previous_value,new_value,reason,request_id,ip_address) values(?,?,?,?,?,?,?,?,?)",
      actor, action, entity, entityId, previous, next, reason, UUID.randomUUID().toString(), ip);
  }

  List<AuditLog> auditLogs() {
    return jdbc.query("""
      select a.id, coalesce(u.name,'System') actor, a.action, a.entity, a.entity_id, a.reason, a.request_id, a.created_at
      from audit_logs a left join users u on u.id=a.actor_user_id order by a.created_at desc limit 50
      """, (rs, row) -> new AuditLog(rs.getLong("id"), rs.getString("actor"), rs.getString("action"), rs.getString("entity"), rs.getString("entity_id"), rs.getString("reason"), rs.getString("request_id"), rs.getTimestamp("created_at").toLocalDateTime()));
  }

  private List<TrendPoint> workforceTrend() {
    return List.of(new TrendPoint("Mon", 92, 4), new TrendPoint("Tue", 95, 3), new TrendPoint("Wed", 91, 5), new TrendPoint("Thu", 96, 2), new TrendPoint("Fri", 94, 4));
  }

  private List<String> recentActivity() {
    return jdbc.queryForList("select action || ' - ' || entity from audit_logs order by created_at desc limit 6", String.class);
  }

  private Object[] blankToNulls(String department, String location) {
    String dept = department == null || department.isBlank() ? null : department;
    String loc = location == null || location.isBlank() ? null : location;
    return new Object[] {dept, dept, loc, loc};
  }

  private EmployeeRow employeeRow(ResultSet rs, int row) throws SQLException {
    return new EmployeeRow(rs.getLong("id"), rs.getString("employee_code"), rs.getString("name"), rs.getString("email"), rs.getString("department"), rs.getString("position"), rs.getString("location"), rs.getString("status"), rs.getDate("joining_date").toLocalDate(), rs.getBoolean("bank_verified"));
  }

  private LeaveRequestRow leaveRow(ResultSet rs, int row) throws SQLException {
    return new LeaveRequestRow(rs.getLong("id"), rs.getString("employee"), rs.getString("leave_type"), rs.getDate("start_date").toLocalDate(), rs.getDate("end_date").toLocalDate(), rs.getBigDecimal("working_days"), rs.getString("status"), rs.getString("reason"), rs.getBigDecimal("balance"));
  }

  private AutomationRule ruleRow(ResultSet rs, int row) throws SQLException {
    return new AutomationRule(rs.getLong("id"), rs.getString("name"), rs.getString("description"), rs.getString("trigger_name"), rs.getString("condition_text"), rs.getString("action_text"), rs.getBoolean("active"), rs.getBoolean("test_mode"), rs.getBoolean("high_risk"), rs.getBigDecimal("success_rate"));
  }
}

@Component
class DemoSeeder implements CommandLineRunner {
  private final JdbcTemplate jdbc;
  private final PasswordEncoder encoder;
  DemoSeeder(JdbcTemplate jdbc, PasswordEncoder encoder) { this.jdbc = jdbc; this.encoder = encoder; }
  @Override public void run(String... args) {
    if (jdbc.queryForObject("select count(*) from roles", Integer.class) > 0) return;
    List<String> permissions = List.of("dashboard:read","employee:read","employee:write","approval:read","approval:decide","payroll:read","email:write","email:send","ticket:read","ticket:confidential","automation:read","automation:write","audit:read");
    permissions.forEach(p -> jdbc.update("insert into permissions(code) values(?)", p));
    List<String> roles = List.of("Super Admin","HR Admin","HR Officer","Payroll Officer","Manager","Employee","IT/Asset Officer");
    roles.forEach(r -> jdbc.update("insert into roles(name) values(?)", r));
    grant("Super Admin", permissions);
    grant("HR Admin", permissions.stream().filter(p -> !p.equals("audit:read")).toList());
    grant("HR Officer", List.of("dashboard:read","employee:read","employee:write","approval:read","approval:decide","email:write","email:send","ticket:read","automation:read"));
    grant("Payroll Officer", List.of("dashboard:read","employee:read","payroll:read","email:write","email:send","audit:read"));
    grant("Manager", List.of("dashboard:read","employee:read","approval:read","approval:decide","ticket:read"));
    grant("Employee", List.of("dashboard:read","ticket:read"));
    grant("IT/Asset Officer", List.of("dashboard:read","employee:read","ticket:read","automation:read"));
    long adminRole = roleId("Super Admin");
    jdbc.update("insert into users(name,email,password_hash,role_id) values(?,?,?,?)", "Amrutha Ramisetty", "admin@dayflow.test", encoder.encode("Dayflow@123"), adminRole);
    jdbc.update("insert into departments(name,location) values('People Operations','Bengaluru'),('Engineering','Hyderabad'),('Finance','Mumbai')");
    jdbc.update("insert into positions(title) values('HR Business Partner'),('Frontend Engineer'),('Payroll Specialist'),('Product Manager')");
    jdbc.update("insert into employees(employee_code,name,email,department_id,position_id,location,employment_type,status,joining_date,salary,bank_verified) values" +
      "('DF-1001','Amrutha Ramisetty','amrutha@dayflow.test',1,1,'Bengaluru','Full-time','Active',dateadd('DAY',-400,current_date),145000.00,true)," +
      "('DF-1002','Rohan Mehta','rohan@dayflow.test',2,2,'Hyderabad','Full-time','Active',dateadd('DAY',-140,current_date),98000.00,true)," +
      "('DF-1003','Nisha Rao','nisha@dayflow.test',3,3,'Mumbai','Full-time','Active',dateadd('DAY',-220,current_date),102000.00,false)," +
      "('DF-1004','Dev Iyer','dev@dayflow.test',2,4,'Hyderabad','Contract','Onboarding',dateadd('DAY',3,current_date),118000.00,true)");
    jdbc.update("insert into attendance(employee_id,work_date,check_in,check_out,status,late_minutes,overtime_minutes) values(1,current_date,dateadd('HOUR',-8,current_timestamp),current_timestamp,'Present',0,20),(2,current_date,dateadd('HOUR',-7,current_timestamp),null,'Present',18,0),(3,current_date,null,null,'Absent',0,0)");
    jdbc.update("insert into leave_balances(employee_id,leave_type,balance) values(2,'Annual Leave',10),(3,'Sick Leave',6)");
    jdbc.update("insert into leave_requests(employee_id,leave_type,start_date,end_date,working_days,status,reason) values(2,'Annual Leave',dateadd('DAY',1,current_date),dateadd('DAY',2,current_date),2,'PENDING','Family event'),(3,'Sick Leave',current_date,current_date,1,'APPROVED','Medical appointment')");
    jdbc.update("insert into payroll_runs(payroll_month,status,gross_total,exception_count) values('2026-08','Under Review',345000.00,2)");
    jdbc.update("insert into payroll_anomalies(payroll_run_id,employee_id,issue,severity,possible_cause,recommended_action,review_status) values(1,3,'Missing bank details','Critical','Bank verification is incomplete','Verify bank information before payroll publication','OPEN'),(1,2,'Excessive overtime','High','Overtime exceeds department median by 35%','Review attendance and manager approval','OPEN')");
    jdbc.update("insert into email_templates(name,subject,body) values('Welcome email','Welcome to {{organizationName}}','Hello {{employeeName}}, welcome to {{organizationName}}.')");
    jdbc.update("insert into hr_tickets(employee_id,category,subject,status,priority,confidential,sla_due_at,assigned_to) values(2,'Attendance','Missing checkout on Friday','Open','High',false,dateadd('DAY',1,current_timestamp),1),(3,'Workplace issues','Confidential grievance','Assigned','Critical',true,dateadd('DAY',2,current_timestamp),1)");
    jdbc.update("insert into automation_rules(name,description,owner_user_id,trigger_name,condition_text,action_text,active,test_mode,high_risk,success_rate) values('Missing checkout reminder','Notify employees when checkout is missing by 10 PM',1,'SCHEDULED_TIME','Checkout is missing after 22:00','Send notification and email reminder',true,false,false,98.50),('Payroll deviation guard','Block publication when payroll deviation exceeds 15%',1,'PAYROLL_CALCULATED','Gross salary changes by more than 15%','Request payroll review and block publication',true,true,true,100.00)");
    jdbc.update("insert into notifications(user_id,title,body,severity) values(1,'Payroll review needed','Two anomalies must be reviewed before payroll publication.','HIGH')");
    jdbc.update("insert into audit_logs(actor_user_id,action,entity,entity_id,reason,request_id) values(1,'SEED_DEMO','System','demo','Initial Dayflow demonstration data',?)", UUID.randomUUID().toString());
  }
  private long roleId(String role) { return jdbc.queryForObject("select id from roles where name=?", Long.class, role); }
  private long permissionId(String code) { return jdbc.queryForObject("select id from permissions where code=?", Long.class, code); }
  private void grant(String role, List<String> permissions) {
    long roleId = roleId(role);
    permissions.forEach(p -> jdbc.update("insert into role_permissions(role_id,permission_id) values(?,?)", roleId, permissionId(p)));
  }
}

@RestControllerAdvice
class ApiErrors {
  @ExceptionHandler(ApiException.class)
  ResponseEntity<ApiResponse<Void>> api(ApiException ex) {
    return ResponseEntity.status(ex.status).body(ApiResponse.error(ex.getMessage()));
  }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiResponse<Void>> validation(MethodArgumentNotValidException ex) {
    return ResponseEntity.badRequest().body(ApiResponse.error("Validation failed: " + ex.getFieldErrors().getFirst().getDefaultMessage()));
  }
  @ExceptionHandler(Exception.class)
  ResponseEntity<ApiResponse<Void>> fallback(Exception ex) {
    return ResponseEntity.status(500).body(ApiResponse.error("Dayflow could not complete the request. Please try again or contact support."));
  }
}

class ApiException extends RuntimeException {
  final HttpStatus status;
  ApiException(HttpStatus status, String message) { super(message); this.status = status; }
}

record ApiResponse<T>(boolean ok, T data, String error) {
  static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>(true, data, null); }
  static <T> ApiResponse<T> error(String error) { return new ApiResponse<>(false, null, error); }
}
record AppUser(long id, String name, String email, String passwordHash, String role, List<String> permissions) {
  AppUser withoutPassword() { return new AppUser(id, name, email, null, role, permissions); }
}
record LoginRequest(@Email String email, @NotBlank String password) {}
record RegisterRequest(@NotBlank String name, @Email String email, @NotBlank String password, @NotBlank String role) {}
record AuthResponse(String accessToken, AppUser user) {}
record Dashboard(String greeting, String organization, String currentDate, String lastSynchronizedAt, List<Kpi> kpis, List<ActionItem> attention, List<TrendPoint> workforceTrend, List<String> recentActivity) {}
record Kpi(String label, int value, String comparison, String trend, String href) {}
record ActionItem(String severity, String title, String detail, String action) {}
record TrendPoint(String label, int present, int absent) {}
record Page<T>(List<T> items, int page, int size, int total) {}
record EmployeeRow(long id, String employeeCode, String name, String email, String department, String position, String location, String status, LocalDate joiningDate, boolean bankVerified) {}
record EmployeeCreate(@NotBlank String employeeCode, @NotBlank String name, @Email String email, @NotBlank String department, @NotBlank String position, @NotBlank String location, @NotBlank String employmentType, LocalDate joiningDate, BigDecimal salary) {}
record LeaveRequestRow(long id, String employee, String leaveType, LocalDate startDate, LocalDate endDate, BigDecimal workingDays, String status, String reason, BigDecimal availableBalance) {}
record LeaveDecision(@NotBlank String decision, String reason) {}
record PayrollAnomaly(long id, String employee, String issue, String severity, String possibleCause, String recommendedAction, String reviewStatus) {}
record EmailSend(@NotEmpty List<@Email String> recipients, @NotBlank String subject, @NotBlank String body, boolean sendNow, boolean bulkConfirmed, LocalDateTime scheduledAt) {}
record EmailMessage(long id, String subject, List<String> recipients, String status, LocalDateTime scheduledAt) {}
record TicketRow(long id, String employee, String category, String subject, String status, String priority, boolean confidential, LocalDateTime slaDueAt) {}
record AutomationRule(long id, String name, String description, String triggerName, String conditionText, String actionText, boolean active, boolean testMode, boolean highRisk, BigDecimal successRate) {}
record RuleToggle(boolean active, boolean confirmed, String reason) {}
record NotificationRow(long id, String title, String body, String severity) {}
record AuditLog(long id, String actor, String action, String entity, String entityId, String reason, String requestId, LocalDateTime createdAt) {}
