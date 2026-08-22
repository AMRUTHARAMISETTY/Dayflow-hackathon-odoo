package com.dayflow.api.automation;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import java.util.List;
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
@RequestMapping("/api/automation-rules")
public class AutomationController {
  private final AutomationRuleService service;

  public AutomationController(AutomationRuleService service) {
    this.service = service;
  }

  @GetMapping
  public ApiResponse<List<AutomationRule>> list(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(service.list(user));
  }

  @GetMapping("/{id}/executions")
  public ApiResponse<List<AutomationExecution>> history(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @RequestParam(defaultValue = "20") int limit) {
    return ApiResponse.ok(service.history(user, id, Math.min(Math.max(limit, 1), 100)));
  }

  @PutMapping("/{id}/active")
  public ApiResponse<AutomationRule> setActive(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @RequestBody ActiveRequest request) {
    return ApiResponse.ok(service.setActive(user, id, request.active()));
  }

  @PutMapping("/{id}/test-mode")
  public ApiResponse<AutomationRule> setTestMode(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @RequestBody TestModeRequest request) {
    return ApiResponse.ok(service.setTestMode(user, id, request.testMode()));
  }

  @PutMapping("/{id}/config")
  public ApiResponse<AutomationRule> updateConfig(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @RequestBody ConfigRequest request) {
    return ApiResponse.ok(service.updateConfig(user, id, request.config()));
  }

  @PostMapping("/{id}/run")
  public ApiResponse<AutomationExecution> run(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @RequestParam(defaultValue = "false") boolean dryRun) {
    return ApiResponse.ok(service.runNow(user, id, dryRun));
  }

  public record ActiveRequest(boolean active) {
  }

  public record TestModeRequest(boolean testMode) {
  }

  public record ConfigRequest(String config) {
  }
}
