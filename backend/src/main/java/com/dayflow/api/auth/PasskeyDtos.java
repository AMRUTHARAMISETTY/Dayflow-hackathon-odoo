package com.dayflow.api.auth;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

record PasskeyOptionsResponse(String challenge, Map<String, Object> publicKey) {
}

record PasskeyRegisterVerifyRequest(@NotBlank String challenge, @NotBlank String credentialId,
    @NotBlank String publicKey, String deviceName, List<String> transports) {
}

record PasskeyLoginOptionsRequest(String identifier) {
}

record PasskeyLoginVerifyRequest(@NotBlank String challenge, @NotBlank String credentialId) {
}

record PasskeyViewResponse(String credentialId, String deviceName, String transports, LocalDateTime createdAt,
    LocalDateTime lastUsedAt) {
}

record SessionViewResponse(long id, String createdIp, String userAgent, String deviceName, LocalDateTime createdAt,
    LocalDateTime lastUsedAt, LocalDateTime expiresAt, boolean current) {
}

record SecurityEventResponse(long id, String eventType, String severity, String detail, String ipAddress,
    LocalDateTime createdAt) {
}
