package com.dayflow.api.ticket;

public record AssignableStaff(long userId, String name, String roleName, boolean canHandleConfidential) {
}
