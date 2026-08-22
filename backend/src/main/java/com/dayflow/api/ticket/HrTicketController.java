package com.dayflow.api.ticket;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tickets")
public class HrTicketController {
  private final HrTicketService ticketService;

  public HrTicketController(HrTicketService ticketService) {
    this.ticketService = ticketService;
  }

  @PostMapping
  public ResponseEntity<ApiResponse<HrTicket>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateTicketRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ticketService.create(user, request)));
  }

  @GetMapping("/assignable")
  public ApiResponse<List<AssignableStaff>> assignableStaff(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(ticketService.assignableStaff(user));
  }

  @GetMapping
  public ApiResponse<PageResponse<HrTicket>> search(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String status, @RequestParam(required = false) String category,
      @RequestParam(required = false) Long employeeId, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(ticketService.search(user, status, category, employeeId, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @GetMapping("/{id}")
  public ApiResponse<HrTicket> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(ticketService.get(user, id));
  }

  @GetMapping("/{id}/messages")
  public ApiResponse<List<HrTicketMessage>> messages(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(ticketService.messages(user, id));
  }

  @PostMapping("/{id}/messages")
  public ResponseEntity<ApiResponse<HrTicketMessage>> addMessage(@AuthenticationPrincipal CurrentUser user,
      @PathVariable long id, @Valid @RequestBody AddMessageRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(ticketService.addMessage(user, id, request)));
  }

  @PostMapping("/{id}/assign")
  public ApiResponse<HrTicket> assign(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody AssignTicketRequest request) {
    return ApiResponse.ok(ticketService.assign(user, id, request));
  }

  @PostMapping("/{id}/status")
  public ApiResponse<HrTicket> updateStatus(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody UpdateStatusRequest request) {
    return ApiResponse.ok(ticketService.updateStatus(user, id, request));
  }

  @PostMapping("/{id}/escalate")
  public ApiResponse<HrTicket> escalate(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(ticketService.escalate(user, id));
  }

  @PostMapping("/{id}/rate")
  public ApiResponse<HrTicket> rate(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody RateTicketRequest request) {
    return ApiResponse.ok(ticketService.rate(user, id, request));
  }
}
