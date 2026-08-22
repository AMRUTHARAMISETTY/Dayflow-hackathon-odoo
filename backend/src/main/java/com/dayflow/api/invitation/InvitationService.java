package com.dayflow.api.invitation;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.auth.AuthService;
import com.dayflow.api.auth.TokenPairResponse;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.common.SecureTokens;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.role.RoleRepository;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.security.SecurityProperties;
import com.dayflow.api.user.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The only path to an HR/Admin/Manager/Payroll/Auditor account: a Super Admin (or an HR Admin,
 * for the roles below it) issues a time-boxed, single-use invitation; the recipient accepts it
 * with a password of their own choosing. Nobody can grant themselves elevated access by any
 * other route (spec section 2 security rule).
 */
@Service
public class InvitationService {
  private static final Set<String> HR_ADMIN_CANNOT_INVITE = Set.of("SUPER_ADMIN", "HR_ADMIN");

  private final InvitationRepository invitationRepository;
  private final RoleRepository roleRepository;
  private final EmployeeRepository employeeRepository;
  private final UserRepository userRepository;
  private final AuditService auditService;
  private final AuthService authService;
  private final PasswordEncoder passwordEncoder;
  private final SecurityProperties securityProperties;

  public InvitationService(InvitationRepository invitationRepository, RoleRepository roleRepository,
      EmployeeRepository employeeRepository, UserRepository userRepository, AuditService auditService,
      AuthService authService, PasswordEncoder passwordEncoder, SecurityProperties securityProperties) {
    this.invitationRepository = invitationRepository;
    this.roleRepository = roleRepository;
    this.employeeRepository = employeeRepository;
    this.userRepository = userRepository;
    this.auditService = auditService;
    this.authService = authService;
    this.passwordEncoder = passwordEncoder;
    this.securityProperties = securityProperties;
  }

  @Transactional
  CreatedInvitation create(CurrentUser actor, CreateInvitationRequest request) {
    actor.require("invitation:write");
    if ("HR_ADMIN".equals(actor.role()) && HR_ADMIN_CANNOT_INVITE.contains(request.roleName().toUpperCase())) {
      throw ApiException.forbidden("HR Admin cannot invite Super Admin or HR Admin accounts. Ask a Super Admin.");
    }
    long roleId;
    try {
      roleId = roleRepository.idByName(request.roleName().toUpperCase());
    } catch (EmptyResultDataAccessException ex) {
      throw ApiException.badRequest("Unknown role: " + request.roleName());
    }
    if (request.employeeId() != null) {
      Employee employee = employeeRepository.findById(request.employeeId())
          .orElseThrow(() -> ApiException.badRequest("Unknown employee."));
      if (employee.hasLoginAccount()) {
        throw ApiException.conflict("This employee already has a login account.");
      }
    } else if (userRepository.existsByEmail(request.email()) || employeeRepository.existsByEmail(request.email())) {
      throw ApiException.conflict("An account with this email already exists.");
    }

    String token = SecureTokens.newOpaqueToken();
    LocalDateTime expiresAt = LocalDateTime.now().plusHours(securityProperties.invitationHours());
    long id = invitationRepository.create(request.email(), roleId, request.employeeId(),
        SecureTokens.sha256Hex(token), expiresAt, actor.userId());
    InvitationView view = invitationRepository.findViewById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_INVITATION", "Invitation", String.valueOf(id), null,
        java.util.Map.of("email", request.email(), "role", request.roleName()), null);
    return new CreatedInvitation(view, token, "/accept-invitation?token=" + token);
  }

  PageResponse<InvitationView> list(CurrentUser actor, String status, int page, int size) {
    actor.require("invitation:read");
    invitationRepository.expirePastDue();
    return invitationRepository.search(status, page, size);
  }

  @Transactional
  void revoke(CurrentUser actor, long id) {
    actor.require("invitation:write");
    invitationRepository.markRevoked(id);
    auditService.record(actor.userId(), "REVOKE_INVITATION", "Invitation", String.valueOf(id), null, null, null);
  }

  AcceptInvitationLookup lookup(String token) {
    InvitationRepository.PendingInvitation pending = invitationRepository.findByTokenHash(SecureTokens.sha256Hex(token))
        .orElseThrow(() -> ApiException.notFound("This invitation link is invalid."));
    boolean expired = !"PENDING".equals(pending.status()) || pending.expiresAt().isBefore(LocalDateTime.now());
    return new AcceptInvitationLookup(pending.email(), pending.roleName(), expired);
  }

  @Transactional
  TokenPairResponse accept(AcceptInvitationRequest request, String ip) {
    InvitationRepository.PendingInvitation pending = invitationRepository.findByTokenHash(SecureTokens.sha256Hex(request.token()))
        .orElseThrow(() -> ApiException.badRequest("This invitation link is invalid."));
    if (!"PENDING".equals(pending.status()) || pending.expiresAt().isBefore(LocalDateTime.now())) {
      throw ApiException.badRequest("This invitation is no longer valid. Ask for a new one.");
    }

    long employeeId;
    if (pending.employeeId() != null) {
      Employee employee = employeeRepository.requireById(pending.employeeId());
      employeeRepository.applySensitiveChange(employee.id(), employee.departmentId(), employee.managerId(),
          employee.employmentType(), "Active");
      employeeRepository.insertJobHistory(employee.id(), employee.departmentId(), employee.designation(),
          employee.managerId(), employee.employmentType(), "Active", LocalDate.now(), "ACTIVATED",
          "Portal access activated via invitation", null);
      employeeId = employee.id();
    } else {
      employeeId = employeeRepository.create(request.name(), pending.email(), null, null, null, null, null, null,
          "Active", LocalDate.now());
      employeeRepository.insertJobHistory(employeeId, null, null, null, null, "Active", LocalDate.now(), "CREATED",
          "Created via invitation acceptance", null);
    }

    long userId = userRepository.create(employeeId, pending.email(), passwordEncoder.encode(request.password()), pending.roleId());
    invitationRepository.markAccepted(pending.id());
    auditService.record(userId, "ACCEPT_INVITATION", "User", String.valueOf(userId), null,
        java.util.Map.of("email", pending.email(), "role", pending.roleName()), null);
    return authService.issueSessionForUser(userId, ip);
  }
}
