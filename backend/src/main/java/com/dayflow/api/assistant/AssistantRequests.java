package com.dayflow.api.assistant;

import jakarta.validation.constraints.NotBlank;

record AskRequest(@NotBlank String question) {
}

record AssistantEscalateRequest(@NotBlank String question, @NotBlank String category, boolean confidential) {
}
