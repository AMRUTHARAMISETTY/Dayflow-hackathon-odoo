package com.dayflow.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {
}

/**
 * Deliberately has no `role` field: public self-registration always creates an
 * EMPLOYEE account server-side (spec section 2 security rule). HR/Admin/Manager/
 * Payroll/Auditor accounts can only be created via {@code InvitationService}.
 */
record RegisterRequest(@NotBlank String name, @Email @NotBlank String email, @NotBlank @Size(min = 8) String password) {
}

record RefreshRequest(@NotBlank String refreshToken) {
}
