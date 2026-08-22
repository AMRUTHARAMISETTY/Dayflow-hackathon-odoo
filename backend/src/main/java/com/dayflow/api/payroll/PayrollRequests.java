package com.dayflow.api.payroll;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.LocalDate;

record CreateSalaryStructureRequest(
    @NotNull LocalDate effectiveFrom,
    @NotNull BigDecimal basicMonthly,
    BigDecimal hraMonthly,
    BigDecimal allowancesMonthly,
    BigDecimal recurringDeductionsMonthly,
    @NotBlank String reason) {
}

record VerificationFlagsRequest(boolean bankVerified, boolean taxIdVerified) {
}

record CreatePayrollRunRequest(@NotBlank @Pattern(regexp = "\\d{4}-\\d{2}", message = "must be in YYYY-MM format") String periodMonth) {
}

record ApprovePayrollRequest(@NotBlank String reason) {
}

record ResolveAnomalyRequest(@NotBlank String status, @NotBlank String resolutionNote) {
}
