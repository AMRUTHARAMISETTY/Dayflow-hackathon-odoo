package com.dayflow.api.email;

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
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/email")
public class EmailController {
  private final EmailService emailService;

  public EmailController(EmailService emailService) {
    this.emailService = emailService;
  }

  @GetMapping("/templates")
  public ApiResponse<List<EmailTemplate>> templates(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(emailService.templates(user));
  }

  @PostMapping("/templates")
  public ResponseEntity<ApiResponse<EmailTemplate>> createTemplate(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateTemplateRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(emailService.createTemplate(user, request)));
  }

  @PostMapping("/preview")
  public ApiResponse<RecipientPreview> preview(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody ComposeEmailRequest request) {
    return ApiResponse.ok(emailService.preview(user, request));
  }

  @PostMapping("/messages")
  public ResponseEntity<ApiResponse<EmailMessage>> send(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody ComposeEmailRequest request,
      @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(emailService.send(user, request, idempotencyKey)));
  }

  @PostMapping("/messages/test")
  public ApiResponse<EmailMessage> sendTest(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody ComposeEmailRequest request) {
    return ApiResponse.ok(emailService.sendTest(user, request));
  }

  @GetMapping("/messages")
  public ApiResponse<PageResponse<EmailMessage>> list(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(emailService.list(user, status, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @GetMapping("/messages/{id}")
  public ApiResponse<EmailMessage> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(emailService.get(user, id));
  }

  @GetMapping("/messages/{id}/deliveries")
  public ApiResponse<List<EmailDelivery>> deliveries(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(emailService.deliveries(user, id));
  }
}
