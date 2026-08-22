package com.dayflow.api.automation;

import java.time.LocalDateTime;

public record AutomationExecution(
    long id,
    long ruleId,
    LocalDateTime startedAt,
    LocalDateTime finishedAt,
    String status,
    int matchedCount,
    int actionCount,
    String detail,
    String errorMessage) {
}
