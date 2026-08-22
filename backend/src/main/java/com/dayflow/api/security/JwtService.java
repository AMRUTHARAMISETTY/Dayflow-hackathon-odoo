package com.dayflow.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Issues and verifies short-lived signed access tokens. Refresh tokens are deliberately
 * NOT JWTs: they are opaque random values whose hash is stored server-side so a single
 * token can be revoked/rotated without needing a blocklist (see RefreshTokenService).
 */
@Service
public class JwtService {
  private final Key key;
  private final int accessTokenMinutes;

  public JwtService(SecurityProperties properties) {
    this.key = Keys.hmacShaKeyFor(properties.jwtSecret().getBytes(StandardCharsets.UTF_8));
    this.accessTokenMinutes = properties.accessTokenMinutes();
  }

  public String issueAccessToken(CurrentUser user) {
    Instant now = Instant.now();
    return Jwts.builder()
        .subject(String.valueOf(user.userId()))
        .claim("employeeId", user.employeeId())
        .claim("name", user.name())
        .claim("email", user.email())
        .claim("role", user.role())
        .claim("permissions", user.permissions())
        .issuedAt(java.util.Date.from(now))
        .expiration(java.util.Date.from(now.plus(accessTokenMinutes, ChronoUnit.MINUTES)))
        .signWith(key)
        .compact();
  }

  public int accessTokenTtlSeconds() {
    return accessTokenMinutes * 60;
  }

  public CurrentUser parse(String token) {
    Claims claims;
    try {
      claims = Jwts.parser().verifyWith((javax.crypto.SecretKey) key).build().parseSignedClaims(token).getPayload();
    } catch (JwtException | IllegalArgumentException ex) {
      throw new BadAccessTokenException();
    }
    long userId = Long.parseLong(claims.getSubject());
    long employeeId = ((Number) claims.get("employeeId")).longValue();
    String name = claims.get("name", String.class);
    String email = claims.get("email", String.class);
    String role = claims.get("role", String.class);
    @SuppressWarnings("unchecked")
    List<String> permissions = claims.get("permissions", List.class);
    return new CurrentUser(userId, employeeId, name, email, role, Set.copyOf(permissions));
  }

  public static class BadAccessTokenException extends RuntimeException {
  }
}
