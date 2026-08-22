package com.dayflow.api.email;

import java.time.LocalDateTime;

public record EmailTemplate(long id, String code, String category, String name, String subject, String body,
    boolean active, String createdByName, LocalDateTime createdAt, LocalDateTime updatedAt) {
}
