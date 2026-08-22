package com.dayflow.api.ticket;

import java.time.LocalDateTime;

public record HrTicketMessage(long id, long ticketId, String authorName, String body, boolean internalNote, LocalDateTime createdAt) {
}
