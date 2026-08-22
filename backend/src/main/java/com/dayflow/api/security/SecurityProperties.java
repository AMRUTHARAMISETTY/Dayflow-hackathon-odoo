package com.dayflow.api.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dayflow.security")
public record SecurityProperties(String jwtSecret, int accessTokenMinutes, int refreshTokenDays, int invitationHours,
    int maxFailedAttempts, int lockoutMinutes) {
}
