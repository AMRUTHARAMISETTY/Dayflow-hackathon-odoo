package com.dayflow.api.ticket;

import jakarta.validation.constraints.NotBlank;

public record CreateTicketRequest(@NotBlank String category, @NotBlank String subject, @NotBlank String description, boolean confidential) {
}
