package com.dayflow.auth.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("dayflow")
public record DayflowProperties(String appOrigin, String companyDomain, String jwtSecret, int accessTokenMinutes,
  int refreshTokenDays, boolean cookieSecure, String mailFrom, Webauthn webauthn, BootstrapAdmin bootstrapAdmin) {
  public record Webauthn(String rpId, String rpName, String allowedOrigin) {}
  public record BootstrapAdmin(String email, String password) {}
}
