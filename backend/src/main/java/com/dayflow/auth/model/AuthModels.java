package com.dayflow.auth.model;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;

public final class AuthModels {
  private AuthModels() {}
  public record User(UUID id, String employeeId, String email, String displayName, String passwordHash, String status,
    boolean emailVerified, int failedAttempts, Instant lockedUntil, Set<String> roles) {}
  public record Principal(UUID id, String employeeId, String email, String displayName, Set<String> roles) {}
  public record LoginRequest(String identifier, String password, boolean rememberDevice, String deviceName) {}
  public record LoginResponse(String accessToken, long expiresIn, Principal user, boolean additionalVerificationRequired) {}
  public record ActivationStart(String employeeId, String companyEmail) {}
  public record ActivationComplete(String employeeId, String companyEmail, String code, String password, boolean accepted) {}
  public record OtpRequest(String identifier, String purpose) {}
  public record OtpVerify(String identifier, String purpose, String code) {}
  public record PasswordResetRequest(String identifier) {}
  public record PasswordReset(String token, String password) {}
  public record Session(UUID id, String deviceName, String approximateLocation, Instant createdAt, Instant lastUsedAt, boolean current) {}
}
