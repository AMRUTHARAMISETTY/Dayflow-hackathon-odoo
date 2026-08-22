package com.dayflow.api.policy;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record Policy(long id, String code, String title, String category, String body, LocalDate effectiveDate,
    boolean active, LocalDateTime createdAt) {
}
