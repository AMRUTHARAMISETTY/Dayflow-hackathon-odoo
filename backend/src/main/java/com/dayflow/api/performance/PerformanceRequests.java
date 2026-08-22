package com.dayflow.api.performance;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

record CreateGoalRequest(long employeeId, @NotBlank String title, String description, String category, LocalDate dueDate) {
}

record UpdateGoalProgressRequest(@Min(0) @Max(100) int progressPercent, @NotBlank String status) {
}

record StartReviewRequest(long employeeId, @NotBlank String cycle) {
}

record SubmitReviewRequest(@Min(1) @Max(5) int rating, String strengths, String improvements, String managerComments) {
}
