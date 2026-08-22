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
import java.util.Optional;
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
  private final LoginAttemptService loginAttemptService;

  public AuthService(UserRepository userRepository, EmployeeRepository employeeRepository,
      RoleRepository roleRepository, RefreshTokenRepository refreshTokenRepository, JwtService jwtService,
      AuditService auditService, PasswordEncoder passwordEncoder, SecurityProperties securityProperties,
      LoginAttemptService loginAttemptService) {
    this.userRepository = userRepository;
    this.employeeRepository = employeeRepository;
    this.roleRepository = roleRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.jwtService = jwtService;
    this.auditService = auditService;
    this.passwordEncoder = passwordEncoder;
    this.securityProperties = securityProperties;
    this.loginAttemptService = loginAttemptService;
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
    String identifier = request.loginIdentifier();
    String identifierKey = identifier.toLowerCase();

    if (loginAttemptService.isLocked(identifierKey)) {
      auditService.record(null, "LOGIN_BLOCKED_LOCKED", "User", identifierKey, null, null,
          "Login attempted while identifier was locked out after repeated failures");
      throw ApiException.locked("Too many failed attempts. Try again in "
          + loginAttemptService.minutesRemaining(identifierKey) + " minute(s).");
    }

    Optional<UserAccount> maybeAccount = userRepository.findByIdentifier(identifier);
    boolean credentialsValid = maybeAccount.isPresent()
        && passwordEncoder.matches(request.password(), maybeAccount.get().passwordHash());

    if (!credentialsValid) {
      Long knownUserId = maybeAccount.map(UserAccount::id).orElse(null);
      boolean justLockedOut = loginAttemptService.recordFailure(identifierKey);
      auditService.record(knownUserId, "LOGIN_FAILED", "User", identifierKey, null, null,
          maybeAccount.isEmpty() ? "No account matches this identifier" : "Password did not match");
      if (justLockedOut) {
        auditService.record(knownUserId, "ACCOUNT_LOCKED", "User", identifierKey, null, null,
            "Locked after " + securityProperties.maxFailedAttempts() + " consecutive failed login attempts");
      }
      throw ApiException.unauthorized("Invalid email or password.");
    }

    UserAccount account = maybeAccount.get();
    if (!identifier.contains("@") && !"EMPLOYEE".equals(account.roleName())) {
      auditService.record(account.id(), "LOGIN_DENIED_EMPLOYEE_ID_FOR_PRIVILEGED_ROLE", "User",
          String.valueOf(account.id()), null, null, "Privileged users must sign in with company email or passkey");
      throw ApiException.unauthorized("Invalid email or password.");
    }
    assertAccountAllowed(account);
    loginAttemptService.recordSuccess(identifierKey);
    userRepository.markLoggedIn(account.id());
    auditService.record(account.id(), "LOGIN", "User", String.valueOf(account.id()), null, null, null);
    return issueTokenPair(account.id(), ip);
  }

  @Transactional
  TokenPairResponse refresh(String rawToken, String ip) {
    String hash = SecureTokens.sha256Hex(rawToken);
    RefreshTokenRepository.ActiveToken token = refreshTokenRepository.findByHash(hash)
        .orElseThrow(() -> ApiException.unauthorized("Refresh session is invalid. Please sign in again."));

    if (token.revokedAt() != null) {
      // This token was already rotated (or explicitly revoked) once before, yet it's
      // being presented again — the classic signal that a refresh token was stolen and
      // an attacker is racing the legitimate client, or a legitimate client's old token
      // leaked. Treat it as compromised: kill every active session for this user so
      // both parties are forced to re-authenticate, rather than silently accepting it.
      refreshTokenRepository.revokeAllForUser(token.userId());
      auditService.record(token.userId(), "REFRESH_TOKEN_REUSE_DETECTED", "User", String.valueOf(token.userId()),
          null, null, "A previously-rotated/revoked refresh token was presented again; all sessions for this user were revoked");
      throw ApiException.unauthorized("This session is no longer valid. Please sign in again.");
    }

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
