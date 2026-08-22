package com.dayflow.api.email;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.employee.EmployeeRepository;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.user.UserRepository;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bulk-send safety follows spec section 10.1 exactly: before anything goes out, the caller must
 * see the real recipient count and a sample rendered email (via {@link #preview}); sending to
 * more than {@link #BULK_CONFIRMATION_THRESHOLD} recipients is refused unless the request
 * explicitly sets bulkConfirmed, so a fat-fingered "all active employees" selection can't fire
 * silently.
 */
@Service
public class EmailService {
  private static final int BULK_CONFIRMATION_THRESHOLD = 10;

  private final EmailTemplateRepository templateRepository;
  private final EmailMessageRepository messageRepository;
  private final EmailDeliveryRepository deliveryRepository;
  private final EmployeeRepository employeeRepository;
  private final UserRepository userRepository;
  private final EmailProvider emailProvider;
  private final AuditService auditService;

  public EmailService(EmailTemplateRepository templateRepository, EmailMessageRepository messageRepository,
      EmailDeliveryRepository deliveryRepository, EmployeeRepository employeeRepository, UserRepository userRepository,
      EmailProvider emailProvider, AuditService auditService) {
    this.templateRepository = templateRepository;
    this.messageRepository = messageRepository;
    this.deliveryRepository = deliveryRepository;
    this.employeeRepository = employeeRepository;
    this.userRepository = userRepository;
    this.emailProvider = emailProvider;
    this.auditService = auditService;
  }

  public List<EmailTemplate> templates(CurrentUser actor) {
    actor.require("email:read");
    return templateRepository.findAllActive();
  }

  @Transactional
  public EmailTemplate createTemplate(CurrentUser actor, CreateTemplateRequest request) {
    actor.require("email:templates:manage");
    long id = templateRepository.create(request.code(), request.category(), request.name(), request.subject(),
        request.body(), actor.userId());
    EmailTemplate created = templateRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_EMAIL_TEMPLATE", "EmailTemplate", String.valueOf(id), null, created, null);
    return created;
  }

  public RecipientPreview preview(CurrentUser actor, ComposeEmailRequest request) {
    actor.require("email:send");
    List<Employee> recipients = resolveRecipients(request.recipients());
    CurrentUserIdentity sender = senderIdentity(actor);
    String sampleSubject = recipients.isEmpty() ? request.subject() : mergeFields(request.subject(), recipients.get(0));
    String sampleBody = recipients.isEmpty() ? request.body() : mergeFields(request.body(), recipients.get(0));
    return new RecipientPreview(recipients.size(), recipients.stream().limit(5).map(Employee::name).toList(),
        sender.name() + " <" + sender.email() + ">", sampleSubject, sampleBody, recipients.size() > BULK_CONFIRMATION_THRESHOLD);
  }

  @Transactional
  public EmailMessage send(CurrentUser actor, ComposeEmailRequest request, String idempotencyKey) {
    actor.require("email:send");
    if (idempotencyKey != null) {
      var existing = messageRepository.findIdByIdempotencyKey(idempotencyKey);
      if (existing.isPresent()) {
        return messageRepository.findById(existing.get()).orElseThrow();
      }
    }
    List<Employee> recipients = resolveRecipients(request.recipients());
    if (recipients.isEmpty()) {
      throw ApiException.badRequest("Select at least one recipient.");
    }
    if (recipients.size() > BULK_CONFIRMATION_THRESHOLD && !request.bulkConfirmed()) {
      throw ApiException.badRequest("This would send to " + recipients.size()
          + " people. Confirm the bulk send after reviewing the recipient preview.");
    }

    boolean scheduled = request.scheduledAt() != null && request.scheduledAt().isAfter(LocalDateTime.now());
    List<Long> recipientIds = recipients.stream().map(Employee::id).toList();
    long messageId = messageRepository.create(actor.userId(), request.templateId(), request.subject(), request.body(),
        recipientIds, scheduled ? "SCHEDULED" : "QUEUED", request.scheduledAt(), request.bulkConfirmed(), idempotencyKey);

    for (Employee recipient : recipients) {
      long deliveryId = deliveryRepository.create(messageId, recipient.id(), recipient.email());
      if (!scheduled) {
        dispatch(deliveryId, recipient, request.subject(), request.body());
      }
    }
    if (!scheduled) {
      messageRepository.markSent(messageId);
    }

    EmailMessage created = messageRepository.findById(messageId).orElseThrow();
    auditService.record(actor.userId(), scheduled ? "SCHEDULE_EMAIL" : "SEND_EMAIL", "EmailMessage",
        String.valueOf(messageId), null,
        java.util.Map.of("subject", request.subject(), "recipientCount", recipients.size()), null);
    return created;
  }

  @Transactional
  public EmailMessage sendTest(CurrentUser actor, ComposeEmailRequest request) {
    actor.require("email:send");
    Employee self = employeeRepository.requireById(actor.employeeId());
    long messageId = messageRepository.create(actor.userId(), request.templateId(), "[TEST] " + request.subject(),
        request.body(), List.of(self.id()), "QUEUED", null, true, null);
    long deliveryId = deliveryRepository.create(messageId, self.id(), self.email());
    dispatch(deliveryId, self, "[TEST] " + request.subject(), request.body());
    messageRepository.markSent(messageId);
    return messageRepository.findById(messageId).orElseThrow();
  }

  private void dispatch(long deliveryId, Employee recipient, String subject, String body) {
    String renderedSubject = mergeFields(subject, recipient);
    String renderedBody = mergeFields(body, recipient);
    EmailProvider.DeliveryResult result = emailProvider.send(recipient.email(), renderedSubject, renderedBody);
    if (result.success()) {
      deliveryRepository.markSent(deliveryId);
    } else {
      deliveryRepository.markFailed(deliveryId, result.errorMessage());
    }
  }

  public PageResponse<EmailMessage> list(CurrentUser actor, String status, int page, int size) {
    actor.require("email:read");
    return messageRepository.search(status, page, size);
  }

  public EmailMessage get(CurrentUser actor, long id) {
    actor.require("email:read");
    return messageRepository.findById(id).orElseThrow(() -> ApiException.notFound("Email message not found."));
  }

  public List<EmailDelivery> deliveries(CurrentUser actor, long id) {
    actor.require("email:read");
    return deliveryRepository.forMessage(id);
  }

  private List<Employee> resolveRecipients(RecipientSelector selector) {
    Set<Long> ids = new LinkedHashSet<>();
    if (selector.allActive()) {
      employeeRepository.findActive(null, null, null).forEach(e -> ids.add(e.id()));
    }
    if (selector.departmentId() != null) {
      employeeRepository.findActive(selector.departmentId(), null, null).forEach(e -> ids.add(e.id()));
    }
    if (selector.employeeIds() != null) {
      ids.addAll(selector.employeeIds());
    }
    return ids.stream()
        .map(id -> employeeRepository.findById(id).orElse(null))
        .filter(e -> e != null && "Active".equals(e.status()))
        .toList();
  }

  private String mergeFields(String text, Employee employee) {
    return text
        .replace("{{employee_name}}", employee.name())
        .replace("{{employee_id}}", employee.employeeCode() == null ? "" : employee.employeeCode())
        .replace("{{department}}", employee.departmentName() == null ? "" : employee.departmentName())
        .replace("{{designation}}", employee.designation() == null ? "" : employee.designation())
        .replace("{{manager_name}}", employee.managerName() == null ? "" : employee.managerName())
        .replace("{{joining_date}}", employee.joiningDate() == null ? "" : employee.joiningDate().toString())
        .replace("{{organization_name}}", "Dayflow");
  }

  private CurrentUserIdentity senderIdentity(CurrentUser actor) {
    return userRepository.findById(actor.userId())
        .map(account -> new CurrentUserIdentity(account.employeeName(), account.email()))
        .orElse(new CurrentUserIdentity(actor.name(), actor.email()));
  }

  private record CurrentUserIdentity(String name, String email) {
  }
}
