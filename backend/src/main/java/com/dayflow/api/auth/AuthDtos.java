package com.dayflow.api.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record LoginRequest(String identifier, String email, @NotBlank String password, boolean rememberDevice) {
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

record GenericIdentifierRequest(@NotBlank String identifier) {
}

record ResetPasswordRequest(@NotBlank String token, @NotBlank @Size(min = 8) String newPassword) {
}

record EmployeeActivationRequest(@NotBlank String employeeId, @Email @NotBlank String email) {
}

record OtpRequest(@NotBlank String identifier) {
}

record OtpVerifyRequest(@NotBlank String identifier, @NotBlank String otp) {
}

record SecurityMessageResponse(String message) {
}
