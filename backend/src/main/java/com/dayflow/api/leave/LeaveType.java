package com.dayflow.api.leave;

public record LeaveType(long id, String name, String description, boolean requiresApproval,
    Integer maxConsecutiveDays, boolean paid, boolean active) {
}
