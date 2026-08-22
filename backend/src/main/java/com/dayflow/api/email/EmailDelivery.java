package com.dayflow.api.email;

import java.time.LocalDateTime;

public record EmailDelivery(long id, long emailMessageId, long employeeId, String employeeName, String emailAddress,
    String status, LocalDateTime sentAt, String errorMessage) {
}
