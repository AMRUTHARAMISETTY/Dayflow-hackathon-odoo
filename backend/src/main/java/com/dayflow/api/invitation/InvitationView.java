package com.dayflow.api.invitation;

import java.time.LocalDateTime;

public record InvitationView(long id, String email, String roleName, Long employeeId, String employeeName,
    String status, String invitedByName, LocalDateTime expiresAt, LocalDateTime acceptedAt, LocalDateTime createdAt) {
}
