package com.dayflow.api.automation;

import java.time.LocalDateTime;

public record AutomationRule(
    long id,
    String code,
    String name,
    String description,
    String triggerType,
    String config,
    boolean active,
    boolean testMode,
    boolean highRisk,
    String ownerName,
    LocalDateTime lastRunAt,
    String lastRunStatus,
    int runCount,
    int successCount,
    double successRatePercent,
    LocalDateTime createdAt,
    LocalDateTime updatedAt) {
}
