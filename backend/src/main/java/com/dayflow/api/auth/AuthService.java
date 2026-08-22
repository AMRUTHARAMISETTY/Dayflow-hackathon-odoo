package com.dayflow.api.auth;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.SecureTokens;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.role.RoleRepository;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.security.JwtService;
import com.dayflow.api.security.SecurityProperties;
import com.dayflow.api.user.UserAccount;
import com.dayflow.api.user.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
  private final UserRepository userRepository;
  private final EmployeeRepository employeeRepository;
  private final RoleRepository roleRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final JwtService jwtService;
  private final AuditService auditService;
  private final PasswordEncoder passwordEncoder;
  private final SecurityProperties securityProperties;

  public AuthService(UserRepository userRepository, EmployeeRepository employeeRepository,
      RoleRepository roleRepository, RefreshTokenRepository refreshTokenRepository, JwtService jwtService,
      AuditService auditService, PasswordEncoder passwordEncoder, SecurityProperties securityProperties) {
    this.userRepository = userRepository;
    this.employeeRepository = employeeRepository;
    this.roleRepository = roleRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
    this.auditService = auditService;
    this.passwordEncoder = passwordEncoder;
    this.securityProperties = securityProperties;
  }

  @Transactional
  TokenPairResponse register(RegisterRequest request, String ip) {
    if (userRepository.existsByEmail(request.email()) || employeeRepository.existsByEmail(request.email())) {
      throw ApiException.conflict("An account with this email already exists.");
    }
    long employeeId = employeeRepository.create(request.name(), request.email(), null, null, null, null, null,
        null, "Pending Profile", null);
    long employeeRoleId = roleRepository.idByName("EMPLOYEE");
    long userId = userRepository.create(employeeId, request.email(), passwordEncoder.encode(request.password()), employeeRoleId);
    employeeRepository.insertJobHistory(employeeId, null, null, null, null, "Pending Profile", LocalDate.now(),
        "CREATED", "Public self-registration", userId);
    auditService.record(userId, "REGISTER", "User", String.valueOf(userId), null,
        java.util.Map.of("email", request.email(), "role", "EMPLOYEE"), "Public employee self-registration");
    return issueTokenPair(userId, ip);
  }

  @Transactional
  TokenPairResponse login(LoginRequest request, String ip) {
    String identifier = request.identifier() == null || request.identifier().isBlank() ? request.email() : request.identifier();
    UserAccount account = userRepository.findByEmailOrEmployeeCode(identifier)
        .orElseThrow(() -> ApiException.unauthorized("Invalid email or password."));
    if (!identifier.contains("@") && !"EMPLOYEE".equals(account.roleName())) {
      auditService.record(account.id(), "LOGIN_DENIED_EMPLOYEE_ID_FOR_PRIVILEGED_ROLE", "User",
          String.valueOf(account.id()), null, null, "Privileged users must sign in with company email or passkey");
      throw ApiException.unauthorized("Invalid email or password.");
    }
    if (!passwordEncoder.matches(request.password(), account.passwordHash())) {
      throw ApiException.unauthorized("Invalid email or password.");
    }
    assertAccountAllowed(account);
    userRepository.markLoggedIn(account.id());
    auditService.record(account.id(), "LOGIN", "User", String.valueOf(account.id()), null, null, null);
    return issueTokenPair(account.id(), ip);
  }

  @Transactional
  TokenPairResponse refresh(String rawToken, String ip) {
    String hash = SecureTokens.sha256Hex(rawToken);
    RefreshTokenRepository.ActiveToken token = refreshTokenRepository.findByHash(hash)
        .orElseThrow(() -> ApiException.unauthorized("Refresh session is invalid. Please sign in again."));
    if (!token.isUsable()) {
      throw ApiException.unauthorized("Refresh session has expired. Please sign in again.");
    }
    refreshTokenRepository.revoke(hash, null);
    return issueTokenPair(token.userId(), ip);
  }

  @Transactional
  void logout(String rawToken) {
    refreshTokenRepository.revoke(SecureTokens.sha256Hex(rawToken), null);
  }

  /** Used by InvitationService to log a user in immediately after they accept an invitation. */
  @Transactional
  public TokenPairResponse issueSessionForUser(long userId, String ip) {
    return issueTokenPair(userId, ip);
  }

  public UserView me(CurrentUser currentUser) {
    UserAccount account = userRepository.findById(currentUser.userId())
        .orElseThrow(() -> ApiException.unauthorized("Session is no longer valid."));
    return toView(account);
  }

  private TokenPairResponse issueTokenPair(long userId, String ip) {
    UserAccount account = userRepository.findById(userId)
        .orElseThrow(() -> ApiException.unauthorized("Account is not active."));
    assertAccountAllowed(account);
    CurrentUser currentUser = new CurrentUser(account.id(), account.employeeId(), account.employeeName(),
        account.email(), account.roleName(), account.permissions());
    String accessToken = jwtService.issueAccessToken(currentUser);
    String refreshToken = SecureTokens.newOpaqueToken();
    LocalDateTime expiresAt = LocalDateTime.now().plusDays(securityProperties.refreshTokenDays());
    refreshTokenRepository.insert(account.id(), SecureTokens.sha256Hex(refreshToken), expiresAt, ip);
    return new TokenPairResponse(accessToken, refreshToken, "Bearer", jwtService.accessTokenTtlSeconds(), toView(account));
  }

  private UserView toView(UserAccount account) {
    Employee employee = employeeRepository.findById(account.employeeId()).orElse(null);
    return new UserView(account.id(), account.employeeId(), employee == null ? null : employee.employeeCode(),
        account.employeeName(), account.email(), account.roleName(), dashboardPath(account.roleName()),
        employee == null ? null : employee.departmentName(), employee == null ? null : employee.designation(),
        account.permissions());
  }

  private void assertAccountAllowed(UserAccount account) {
    if (!account.active()) {
      throw ApiException.unauthorized("Invalid email or password.");
    }
    String status = account.employeeStatus() == null ? "" : account.employeeStatus().toLowerCase();
    if (status.contains("suspend") || status.contains("terminat") || status.contains("archive")) {
      throw ApiException.unauthorized("This account is not available. Please contact HR support.");
    }
  }

  private String dashboardPath(String roleName) {
    return "EMPLOYEE".equals(roleName) ? "/employee/dashboard" : "/admin/dashboard";
  }
}
