package com.dayflow.api.policy;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/policies")
public class PolicyController {
  private final PolicyService policyService;

  public PolicyController(PolicyService policyService) {
    this.policyService = policyService;
  }

  @GetMapping
  public ApiResponse<List<Policy>> list(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String category, @RequestParam(required = false) String q) {
    return ApiResponse.ok(policyService.list(user, category, q));
  }

  @GetMapping("/{id}")
  public ApiResponse<Policy> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(policyService.get(user, id));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<Policy>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreatePolicyRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(policyService.create(user, request)));
  }

  @PutMapping("/{id}")
  public ApiResponse<Policy> update(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody UpdatePolicyRequest request) {
    return ApiResponse.ok(policyService.update(user, id, request));
  }

  @PostMapping("/{id}/archive")
  public ApiResponse<Policy> archive(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(policyService.setActive(user, id, false));
  }

  @PostMapping("/{id}/activate")
  public ApiResponse<Policy> activate(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(policyService.setActive(user, id, true));
  }
}
