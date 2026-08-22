package com.dayflow.api.ticket;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiException;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.notification.NotificationService;
import com.dayflow.api.security.CurrentUser;
import com.dayflow.api.user.UserAccount;
import com.dayflow.api.user.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Spec section 12: category/priority suggestion is rule-based (keyword matching), not a model
 * call — there's no AI credential configured in this backend. Confidential tickets are
 * structurally restricted: only the reporting employee, users with `ticket:confidential:read`,
 * and whoever they're assigned to (assignment itself is refused to anyone without that
 * permission) can ever see one.
 */
@Service
public class HrTicketService {
  private static final Set<String> URGENT_KEYWORDS = Set.of("harassment", "urgent", "safety", "legal", "threat", "discrimination");
  private static final List<String> VALID_STATUSES = List.of("OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING", "RESOLVED", "CLOSED");

  private final HrTicketRepository ticketRepository;
  private final HrTicketMessageRepository messageRepository;
  private final UserRepository userRepository;
  private final AuditService auditService;
  private final NotificationService notificationService;

  public HrTicketService(HrTicketRepository ticketRepository, HrTicketMessageRepository messageRepository,
      UserRepository userRepository, AuditService auditService, NotificationService notificationService) {
    this.ticketRepository = ticketRepository;
    this.messageRepository = messageRepository;
    this.userRepository = userRepository;
    this.auditService = auditService;
    this.notificationService = notificationService;
  }

  @Transactional
  public HrTicket create(CurrentUser actor, CreateTicketRequest request) {
    actor.require("ticket:read:own");
    boolean confidential = request.confidential() || "Confidential Grievance".equalsIgnoreCase(request.category());
    String priority = suggestPriority(request.subject() + " " + request.description());
    LocalDateTime slaDueAt = LocalDateTime.now().plusHours(slaHours(priority));

    long id = ticketRepository.create(actor.employeeId(), request.category(), request.subject(), request.description(),
        priority, confidential, slaDueAt);
    HrTicket created = ticketRepository.findById(id).orElseThrow();
    auditService.record(actor.userId(), "CREATE_TICKET", "HrTicket", String.valueOf(id), null,
        java.util.Map.of("category", request.category(), "confidential", confidential), null);

    List<String> notifyRoles = confidential ? List.of("HR_ADMIN") : List.of("HR_ADMIN", "HR_OFFICER");
    for (Long userId : userRepository.findUserIdsByRoles(notifyRoles)) {
      notificationService.notify(userId, "TICKET", priority.equals("CRITICAL") || priority.equals("HIGH") ? "WARNING" : "INFO",
          "New HR ticket: " + request.subject(), created.employeeName() + " opened a " + request.category() + " ticket.", "/tickets");
    }
    return created;
  }

  public List<AssignableStaff> assignableStaff(CurrentUser actor) {
    actor.require("ticket:manage");
    return ticketRepository.findAssignableStaff();
  }

  public PageResponse<HrTicket> search(CurrentUser actor, String status, String category, Long employeeId, int page, int size) {
    if (actor.has("ticket:read")) {
      return ticketRepository.search(status, category, employeeId, actor.has("ticket:confidential:read"), page, size);
    }
    if (actor.has("ticket:read:own")) {
      return ticketRepository.search(status, category, actor.employeeId(), true, page, size);
    }
    throw ApiException.forbidden("You do not have permission to view HR tickets.");
  }

  public HrTicket get(CurrentUser actor, long id) {
    HrTicket ticket = requireTicket(id);
    assertCanView(actor, ticket);
    return ticket;
  }

  public List<HrTicketMessage> messages(CurrentUser actor, long id) {
    HrTicket ticket = requireTicket(id);
    assertCanView(actor, ticket);
    boolean includeInternal = actor.has("ticket:manage");
    return messageRepository.forTicket(id, includeInternal);
  }

  @Transactional
  public HrTicketMessage addMessage(CurrentUser actor, long id, AddMessageRequest request) {
    HrTicket ticket = requireTicket(id);
    assertCanView(actor, ticket);
    if (request.internalNote() && !actor.has("ticket:manage")) {
      throw ApiException.forbidden("Only HR can leave internal notes.");
    }
    long messageId = messageRepository.create(id, actor.userId(), request.body(), request.internalNote());
    if (!request.internalNote() && actor.has("ticket:manage") && ticket.employeeId() != actor.employeeId()) {
      userRepository.findByEmployeeId(ticket.employeeId()).ifPresent(account -> notificationService.notify(
          account.id(), "TICKET", "INFO", "Update on your HR ticket", "There's a new reply on \"" + ticket.subject() + "\".", "/tickets"));
    }
    auditService.record(actor.userId(), "ADD_TICKET_MESSAGE", "HrTicket", String.valueOf(id), null,
        java.util.Map.of("internalNote", request.internalNote()), null);
    return messageRepository.forTicket(id, true).stream().filter(m -> m.id() == messageId).findFirst().orElseThrow();
  }

  @Transactional
  public HrTicket assign(CurrentUser actor, long id, AssignTicketRequest request) {
    actor.require("ticket:manage");
    HrTicket ticket = requireTicket(id);
    UserAccount assignee = userRepository.findById(request.assignedToUserId())
        .orElseThrow(() -> ApiException.badRequest("Unknown user."));
    if (!assignee.permissions().contains("ticket:manage")) {
      throw ApiException.badRequest(assignee.employeeName() + " does not have HR ticket-handling permissions.");
    }
    if (ticket.confidential() && !assignee.permissions().contains("ticket:confidential:read")) {
      throw ApiException.forbidden("This is a confidential ticket; it can only be assigned to someone with confidential access.");
    }
    ticketRepository.assign(id, request.assignedToUserId());
    HrTicket after = requireTicket(id);
    auditService.record(actor.userId(), "ASSIGN_TICKET", "HrTicket", String.valueOf(id), ticket, after, null);
    notificationService.notify(request.assignedToUserId(), "TICKET", "INFO", "Ticket assigned to you",
        "\"" + ticket.subject() + "\" has been assigned to you.", "/tickets");
    return after;
  }

  @Transactional
  public HrTicket updateStatus(CurrentUser actor, long id, UpdateStatusRequest request) {
    actor.require("ticket:manage");
    if (!VALID_STATUSES.contains(request.status())) {
      throw ApiException.badRequest("Unknown status.");
    }
    HrTicket ticket = requireTicket(id);
    ticketRepository.updateStatus(id, request.status());
    HrTicket after = requireTicket(id);
    auditService.record(actor.userId(), "UPDATE_TICKET_STATUS", "HrTicket", String.valueOf(id), ticket, after, null);
    if (List.of("RESOLVED", "CLOSED").contains(request.status())) {
      userRepository.findByEmployeeId(ticket.employeeId()).ifPresent(account -> notificationService.notify(
          account.id(), "TICKET", "INFO", "Your HR ticket was " + request.status().toLowerCase(Locale.ROOT),
          "\"" + ticket.subject() + "\" is now " + request.status().toLowerCase(Locale.ROOT) + ".", "/tickets"));
    }
    return after;
  }

  @Transactional
  public HrTicket escalate(CurrentUser actor, long id) {
    actor.require("ticket:manage");
    HrTicket ticket = requireTicket(id);
    String nextPriority = switch (ticket.priority()) {
      case "LOW" -> "MEDIUM";
      case "MEDIUM" -> "HIGH";
      default -> "CRITICAL";
    };
    ticketRepository.updatePriority(id, nextPriority);
    HrTicket after = requireTicket(id);
    auditService.record(actor.userId(), "ESCALATE_TICKET", "HrTicket", String.valueOf(id), ticket, after, null);
    for (Long userId : userRepository.findUserIdsByRoles(List.of("HR_ADMIN"))) {
      notificationService.notify(userId, "TICKET", "CRITICAL", "Ticket escalated", "\"" + ticket.subject() + "\" was escalated to " + nextPriority + ".", "/tickets");
    }
    return after;
  }

  @Transactional
  public HrTicket rate(CurrentUser actor, long id, RateTicketRequest request) {
    HrTicket ticket = requireTicket(id);
    if (ticket.employeeId() != actor.employeeId()) {
      throw ApiException.forbidden("Only the employee who raised this ticket can rate it.");
    }
    if (!List.of("RESOLVED", "CLOSED").contains(ticket.status())) {
      throw ApiException.conflict("You can only rate a resolved or closed ticket.");
    }
    if (request.rating() < 1 || request.rating() > 5) {
      throw ApiException.badRequest("Rating must be between 1 and 5.");
    }
    ticketRepository.rate(id, request.rating());
    return requireTicket(id);
  }

  private void assertCanView(CurrentUser actor, HrTicket ticket) {
    if (ticket.employeeId() == actor.employeeId()) {
      return;
    }
    if (ticket.confidential()) {
      if (actor.has("ticket:confidential:read")) {
        return;
      }
      throw ApiException.forbidden("This is a confidential ticket.");
    }
    if (actor.has("ticket:read")) {
      return;
    }
    throw ApiException.forbidden("You do not have permission to view this ticket.");
  }

  private String suggestPriority(String text) {
    String lower = text.toLowerCase(Locale.ROOT);
    for (String keyword : URGENT_KEYWORDS) {
      if (lower.contains(keyword)) {
        return "HIGH";
      }
    }
    return "MEDIUM";
  }

  private long slaHours(String priority) {
    return switch (priority) {
      case "CRITICAL" -> 4;
      case "HIGH" -> 24;
      case "MEDIUM" -> 72;
      default -> 120;
    };
  }

  private HrTicket requireTicket(long id) {
    return ticketRepository.findById(id).orElseThrow(() -> ApiException.notFound("Ticket not found."));
  }
}
