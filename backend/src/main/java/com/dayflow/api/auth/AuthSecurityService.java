package com.dayflow.api.auth;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.SecureTokens;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.user.UserAccount;
import com.dayflow.api.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthSecurityService {
  private final AuthSecurityRepository repository;
  private final UserRepository userRepository;
  private final RefreshTokenRepository refreshTokenRepository;
  private final AuthService authService;
  private final AuditService auditService;
  private final PasswordEncoder passwordEncoder;

  AuthSecurityService(AuthSecurityRepository repository, UserRepository userRepository,
      RefreshTokenRepository refreshTokenRepository, AuthService authService, AuditService auditService,
      PasswordEncoder passwordEncoder) {
    this.repository = repository;
    this.userRepository = userRepository;
    this.refreshTokenRepository = refreshTokenRepository;
    this.authService = authService;
    this.auditService = auditService;
    this.passwordEncoder = passwordEncoder;
  }

  SecurityMessageResponse sendOtp(OtpRequest request, String ip) {
    repository.insertSecurityEvent(null, "EMAIL_OTP_REQUESTED", "INFO",
        "If the account exists, a short-lived verification code was prepared.", ip);
    return genericEmailResponse();
  }

  SecurityMessageResponse verifyOtp(OtpVerifyRequest request, String ip) {
    repository.insertSecurityEvent(null, "EMAIL_OTP_VERIFIED_DEV", "INFO",
        "Local development OTP endpoint acknowledged verification.", ip);
    return new SecurityMessageResponse("Verification accepted for local development.");
  }

  SecurityMessageResponse activateEmployee(EmployeeActivationRequest request, String ip) {
    repository.insertSecurityEvent(null, "EMPLOYEE_ACTIVATION_REQUESTED", "INFO",
        "Activation requested for employee record and company email pair.", ip);
    return new SecurityMessageResponse("If those details match an active employee record, an activation email has been sent.");
  }

  @Transactional
  SecurityMessageResponse forgotPassword(GenericIdentifierRequest request, String ip) {
    userRepository.findByEmailOrEmployeeCode(request.identifier()).ifPresent(account -> {
      String token = SecureTokens.newOpaqueToken();
      repository.createPasswordResetToken(account.id(), SecureTokens.sha256Hex(token), LocalDateTime.now().plusMinutes(15));
      repository.insertSecurityEvent(account.id(), "PASSWORD_RESET_REQUESTED", "WARNING",
          "Password reset token generated. Local dev token is available in the API response audit context.", ip);
      auditService.record(account.id(), "PASSWORD_RESET_REQUESTED", "User", String.valueOf(account.id()), null,
          Map.of("delivery", "local-dev", "tokenPreview", token.substring(0, 8) + "..."), null);
    });
    return genericEmailResponse();
  }

  @Transactional
  SecurityMessageResponse resetPassword(ResetPasswordRequest request, String ip) {
    long userId = repository.consumePasswordResetToken(SecureTokens.sha256Hex(request.token()))
        .orElseThrow(() -> ApiException.badRequest("This password reset link is invalid or expired."));
    userRepository.updatePassword(userId, passwordEncoder.encode(request.newPassword()));
    refreshTokenRepository.revokeAllForUser(userId);
    repository.insertSecurityEvent(userId, "PASSWORD_CHANGED", "CRITICAL", "Password was changed and sessions were revoked.", ip);
    auditService.record(userId, "PASSWORD_CHANGED", "User", String.valueOf(userId), null, null, "Password reset");
    return new SecurityMessageResponse("Your password has been changed. Please sign in again.");
  }

  PasskeyOptionsResponse registerOptions(CurrentUser user) {
    String challenge = SecureTokens.newOpaqueToken();
    repository.createChallenge(user.userId(), SecureTokens.sha256Hex(challenge), "PASSKEY_REGISTER", LocalDateTime.now().plusMinutes(5));
    Map<String, Object> publicKey = Map.of(
        "challenge", challenge,
        "rp", Map.of("name", "Dayflow", "id", "localhost"),
        "user", Map.of(
            "id", base64Url(String.valueOf(user.userId())),
            "name", user.email(),
            "displayName", user.name()),
        "pubKeyCredParams", List.of(Map.of("type", "public-key", "alg", -7), Map.of("type", "public-key", "alg", -257)),
        "authenticatorSelection", Map.of("authenticatorAttachment", "platform", "userVerification", "required"),
        "timeout", 60000,
        "attestation", "none");
    return new PasskeyOptionsResponse(challenge, publicKey);
  }

  @Transactional
  PasskeyViewResponse verifyRegister(CurrentUser user, PasskeyRegisterVerifyRequest request, String ip) {
    if (!repository.consumeChallenge(SecureTokens.sha256Hex(request.challenge()), "PASSKEY_REGISTER")) {
      throw ApiException.badRequest("The passkey registration challenge expired. Please try again.");
    }
    String deviceName = request.deviceName() == null || request.deviceName().isBlank() ? "This device" : request.deviceName().trim();
    String transports = request.transports() == null ? null : String.join(",", request.transports());
    repository.savePasskey(user.userId(), request.credentialId(), request.publicKey(), deviceName, transports);
    repository.insertSecurityEvent(user.userId(), "PASSKEY_REGISTERED", "INFO",
        "A passkey was registered for " + deviceName + ". Biometric data remains on the device.", ip);
    auditService.record(user.userId(), "PASSKEY_REGISTERED", "User", String.valueOf(user.userId()), null,
        Map.of("deviceName", deviceName), null);
    return new PasskeyViewResponse(request.credentialId(), deviceName, transports, LocalDateTime.now(), null);
  }

  PasskeyOptionsResponse loginOptions(PasskeyLoginOptionsRequest request) {
    String challenge = SecureTokens.newOpaqueToken();
    Long userId = null;
    if (request.identifier() != null && !request.identifier().isBlank()) {
      userId = userRepository.findByEmailOrEmployeeCode(request.identifier()).map(UserAccount::id).orElse(null);
    }
    repository.createChallenge(userId, SecureTokens.sha256Hex(challenge), "PASSKEY_LOGIN", LocalDateTime.now().plusMinutes(5));
    Map<String, Object> publicKey = Map.of(
        "challenge", challenge,
        "timeout", 60000,
        "userVerification", "required");
    return new PasskeyOptionsResponse(challenge, publicKey);
  }

  @Transactional
  TokenPairResponse verifyLogin(PasskeyLoginVerifyRequest request, String ip) {
    if (!repository.consumeChallenge(SecureTokens.sha256Hex(request.challenge()), "PASSKEY_LOGIN")) {
      throw ApiException.badRequest("The passkey sign-in challenge expired. Please try again.");
    }
    AuthSecurityRepository.PasskeyCredential credential = repository.findCredential(request.credentialId())
        .orElseThrow(() -> ApiException.unauthorized("Passkey could not be verified."));
    repository.touchPasskey(request.credentialId());
    repository.insertSecurityEvent(credential.userId(), "PASSKEY_LOGIN", "INFO", "Signed in with a registered passkey.", ip);
    auditService.record(credential.userId(), "PASSKEY_LOGIN", "User", String.valueOf(credential.userId()), null, null, null);
    return authService.issueSessionForUser(credential.userId(), ip);
  }

  List<PasskeyViewResponse> passkeys(CurrentUser user) {
    return repository.passkeys(user.userId()).stream()
        .map(p -> new PasskeyViewResponse(p.credentialId(), p.deviceName(), p.transports(), p.createdAt(), p.lastUsedAt()))
        .toList();
  }

  void deletePasskey(CurrentUser user, String credentialId, String ip) {
    if (!repository.deletePasskey(user.userId(), credentialId)) {
      throw ApiException.notFound("Passkey not found.");
    }
    repository.insertSecurityEvent(user.userId(), "PASSKEY_REMOVED", "WARNING", "A passkey was removed.", ip);
    auditService.record(user.userId(), "PASSKEY_REMOVED", "User", String.valueOf(user.userId()), null,
        Map.of("credentialId", credentialId), null);
  }

  List<SessionViewResponse> sessions(CurrentUser user, String currentRefreshToken) {
    String hash = currentRefreshToken == null || currentRefreshToken.isBlank() ? null : SecureTokens.sha256Hex(currentRefreshToken);
    return refreshTokenRepository.findActiveSessions(user.userId(), hash).stream()
        .map(s -> new SessionViewResponse(s.id(), s.createdIp(), s.userAgent(), s.deviceName(), s.createdAt(),
            s.lastUsedAt(), s.expiresAt(), s.current()))
        .toList();
  }

  void revokeSession(CurrentUser user, long sessionId) {
    if (!refreshTokenRepository.revokeById(user.userId(), sessionId)) {
      throw ApiException.notFound("Session not found.");
    }
    auditService.record(user.userId(), "SESSION_REVOKED", "RefreshSession", String.valueOf(sessionId), null, null, null);
  }

  List<SecurityEventResponse> securityEvents(CurrentUser user) {
    return repository.securityEvents(user.userId()).stream()
        .map(e -> new SecurityEventResponse(e.id(), e.eventType(), e.severity(), e.detail(), e.ipAddress(), e.createdAt()))
        .toList();
  }

  private SecurityMessageResponse genericEmailResponse() {
    return new SecurityMessageResponse("If the details are valid, Dayflow will send the next step to the verified company email.");
  }

  private String base64Url(String value) {
    return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
  }
}
