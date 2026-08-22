package com.dayflow.api.performance;

import java.time.LocalDateTime;

public record PerformanceReview(long id, long employeeId, String employeeName, long reviewerUserId, String reviewerName,
    String cycle, Integer rating, String strengths, String improvements, String managerComments, String status,
    LocalDateTime submittedAt, LocalDateTime acknowledgedAt, LocalDateTime createdAt, LocalDateTime updatedAt) {
}
