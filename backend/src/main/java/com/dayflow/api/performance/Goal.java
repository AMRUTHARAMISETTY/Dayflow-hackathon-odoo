package com.dayflow.api.performance;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record Goal(long id, long employeeId, String employeeName, String title, String description, String category,
    LocalDate dueDate, String status, int progressPercent, String createdByName, LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
