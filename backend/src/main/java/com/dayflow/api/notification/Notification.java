package com.dayflow.api.notification;

import java.time.LocalDateTime;

public record Notification(long id, String category, String severity, String title, String body, String link,
    LocalDateTime readAt, LocalDateTime createdAt) {
}
