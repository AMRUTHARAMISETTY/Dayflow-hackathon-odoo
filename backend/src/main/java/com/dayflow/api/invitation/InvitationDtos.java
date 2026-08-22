package com.dayflow.api.invitation;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

record CreateInvitationRequest(@Email @NotBlank String email, @NotBlank String roleName, Long employeeId) {
}

/** Returned once, at creation time, so the inviter can share it manually until Phase 5 wires up real email delivery. */
record CreatedInvitation(InvitationView invitation, String token, String acceptPath) {
}

record AcceptInvitationLookup(String email, String roleName, boolean expired) {
}

record AcceptInvitationRequest(@NotBlank String token, @NotBlank String name, @NotBlank @Size(min = 8) String password) {
}
