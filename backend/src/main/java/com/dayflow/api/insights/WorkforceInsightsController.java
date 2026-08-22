package com.dayflow.api.insights;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
public class WorkforceInsightsController {
  private final WorkforceInsightsService insightsService;

  public WorkforceInsightsController(WorkforceInsightsService insightsService) {
    this.insightsService = insightsService;
  }

  @GetMapping("/headcount-trend")
  public ApiResponse<List<HeadcountPoint>> headcountTrend(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(insightsService.headcountTrend(user));
  }

  @GetMapping("/attrition-risk")
  public ApiResponse<List<AttritionRiskEntry>> attritionRisk(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(insightsService.attritionRisk(user));
  }
}
