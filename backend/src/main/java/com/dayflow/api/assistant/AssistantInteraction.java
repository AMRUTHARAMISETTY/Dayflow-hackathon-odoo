package com.dayflow.api.assistant;

import java.time.LocalDateTime;

public record AssistantInteraction(long id, long employeeId, String question, String intent, String answer,
    Long policyId, String actionTaken, LocalDateTime createdAt) {
}
