package com.dayflow.api.ticket;

import jakarta.validation.constraints.NotBlank;

record AddMessageRequest(@NotBlank String body, boolean internalNote) {
}

record AssignTicketRequest(long assignedToUserId) {
}

record UpdateStatusRequest(@NotBlank String status) {
}

record RateTicketRequest(int rating) {
}
