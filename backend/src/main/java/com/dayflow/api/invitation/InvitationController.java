package com.dayflow.api.invitation;

import com.dayflow.api.auth.TokenPairResponse;
import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
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
@RequestMapping("/api/invitations")
public class InvitationController {
  private final InvitationService invitationService;

  public InvitationController(InvitationService invitationService) {
    this.invitationService = invitationService;
  }

  @PostMapping
  public ResponseEntity<ApiResponse<CreatedInvitation>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateInvitationRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(invitationService.create(user, request)));
  }

  @GetMapping
  public ApiResponse<PageResponse<InvitationView>> list(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String status,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(invitationService.list(user, status, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @PostMapping("/{id}/revoke")
  public ApiResponse<Void> revoke(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    invitationService.revoke(user, id);
    return ApiResponse.ok(null);
  }

  @GetMapping("/lookup/{token}")
  public ApiResponse<AcceptInvitationLookup> lookup(@PathVariable String token) {
    return ApiResponse.ok(invitationService.lookup(token));
  }

  @PostMapping("/accept")
  public ApiResponse<TokenPairResponse> accept(@Valid @RequestBody AcceptInvitationRequest request,
      HttpServletRequest servletRequest) {
    return ApiResponse.ok(invitationService.accept(request, servletRequest.getRemoteAddr()));
  }
}
