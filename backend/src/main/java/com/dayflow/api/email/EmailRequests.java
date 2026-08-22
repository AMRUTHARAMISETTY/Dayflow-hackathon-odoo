package com.dayflow.api.email;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

record RecipientSelector(List<Long> employeeIds, Long departmentId, boolean allActive) {
}

record ComposeEmailRequest(
    Long templateId,
    RecipientSelector recipients,
    @NotBlank String subject,
    @NotBlank String body,
    LocalDateTime scheduledAt,
    boolean bulkConfirmed) {
}

record CreateTemplateRequest(@NotBlank String code, @NotBlank String category, @NotBlank String name,
    @NotBlank String subject, @NotBlank String body) {
}

record RecipientPreview(int recipientCount, List<String> sampleNames, String senderIdentity, String sampleRenderedSubject,
    String sampleRenderedBody, boolean requiresBulkConfirmation) {
}
