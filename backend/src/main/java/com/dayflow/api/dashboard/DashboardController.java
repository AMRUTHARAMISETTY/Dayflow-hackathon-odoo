package com.dayflow.api.dashboard;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {
  private final DashboardService dashboardService;

  public DashboardController(DashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping("/summary")
  public ApiResponse<DashboardSummary> summary(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(dashboardService.summary(user));
  }
}
