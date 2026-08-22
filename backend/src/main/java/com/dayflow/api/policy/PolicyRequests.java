package com.dayflow.api.policy;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

record CreatePolicyRequest(@NotBlank String code, @NotBlank String title, @NotBlank String category,
    @NotBlank String body, @NotNull LocalDate effectiveDate) {
}

record UpdatePolicyRequest(@NotBlank String title, @NotBlank String category, @NotBlank String body,
    @NotNull LocalDate effectiveDate) {
}
