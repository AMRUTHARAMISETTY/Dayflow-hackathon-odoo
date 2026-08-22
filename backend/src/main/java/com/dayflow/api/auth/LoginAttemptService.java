package com.dayflow.api.auth;

import com.dayflow.api.security.SecurityProperties;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import java.time.Duration;
import java.time.Instant;
import org.springframework.stereotype.Component;

/**
 * In-memory brute-force guard for the login endpoint. Tracks consecutive failed
 * attempts per login identifier (email or employee code, case-insensitive) and
 * locks that identifier out for a configurable window after too many failures.
 *
 * <p>State is process-local (Caffeine) and intentionally does not survive a
 * restart or span multiple instances — acceptable for this deployment. A
 * persistent or shared store (e.g. a database table or Redis) would be the
 * natural upgrade if this ever runs behind a load balancer with more than one
 * instance.
 */
@Component
class LoginAttemptService {

  private record State(int failures, Instant lockedUntil) {
  }

  private final Cache<String, State> states;
  private final int maxFailedAttempts;
  private final Duration lockoutDuration;

  LoginAttemptService(SecurityProperties properties) {
    this.maxFailedAttempts = properties.maxFailedAttempts();
    this.lockoutDuration = Duration.ofMinutes(properties.lockoutMinutes());
    this.states = Caffeine.newBuilder()
        .expireAfterWrite(Duration.ofMinutes(Math.max(properties.lockoutMinutes(), 15)))
        .maximumSize(50_000)
        .build();
  }

  boolean isLocked(String identifierKey) {
    State state = states.getIfPresent(identifierKey);
    return state != null && state.lockedUntil() != null && Instant.now().isBefore(state.lockedUntil());
  }

  /** Whole minutes remaining until the lock clears, rounded up; 0 if not currently locked. */
  long minutesRemaining(String identifierKey) {
    State state = states.getIfPresent(identifierKey);
    if (state == null || state.lockedUntil() == null) {
      return 0;
    }
    Duration remaining = Duration.between(Instant.now(), state.lockedUntil());
    return remaining.isNegative() ? 0 : remaining.toMinutes() + 1;
  }

  /** Records a failed attempt and returns true if this specific failure just triggered a new lockout. */
  boolean recordFailure(String identifierKey) {
    State[] result = new State[1];
    states.asMap().compute(identifierKey, (key, existing) -> {
      int failures = (existing == null ? 0 : existing.failures()) + 1;
      Instant lockedUntil = failures >= maxFailedAttempts ? Instant.now().plus(lockoutDuration) : null;
      result[0] = new State(failures, lockedUntil);
      return result[0];
    });
    return result[0].lockedUntil() != null && result[0].failures() == maxFailedAttempts;
  }

  void recordSuccess(String identifierKey) {
    states.invalidate(identifierKey);
  }
}
