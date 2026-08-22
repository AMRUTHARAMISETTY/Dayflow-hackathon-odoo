package com.dayflow.api.leave;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

record SubmitLeaveRequest(@NotNull Long leaveTypeId, @NotNull LocalDate startDate, @NotNull LocalDate endDate, @NotBlank String reason) {
}

record LeaveDecisionRequest(boolean approve, @NotBlank String reason) {
}

record CancelLeaveRequest(@NotBlank String reason) {
}
