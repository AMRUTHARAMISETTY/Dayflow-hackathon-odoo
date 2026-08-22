package com.dayflow.api.performance;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/performance")
public class PerformanceController {
  private final PerformanceService performanceService;

  public PerformanceController(PerformanceService performanceService) {
    this.performanceService = performanceService;
  }

  @GetMapping("/employees/{employeeId}/goals")
  public ApiResponse<List<Goal>> goals(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId) {
    return ApiResponse.ok(performanceService.goals(user, employeeId));
  }

  @PostMapping("/goals")
  public ResponseEntity<ApiResponse<Goal>> createGoal(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody CreateGoalRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(performanceService.createGoal(user, request)));
  }

  @PostMapping("/goals/{id}/progress")
  public ApiResponse<Goal> updateGoalProgress(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @Valid @RequestBody UpdateGoalProgressRequest request) {
    return ApiResponse.ok(performanceService.updateGoalProgress(user, id, request));
  }

  @GetMapping("/employees/{employeeId}/reviews")
  public ApiResponse<List<PerformanceReview>> reviews(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId) {
    return ApiResponse.ok(performanceService.reviews(user, employeeId));
  }

  @PostMapping("/reviews")
  public ResponseEntity<ApiResponse<PerformanceReview>> startReview(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody StartReviewRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(performanceService.startReview(user, request)));
  }

  @PostMapping("/reviews/{id}/submit")
  public ApiResponse<PerformanceReview> submitReview(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @Valid @RequestBody SubmitReviewRequest request) {
    return ApiResponse.ok(performanceService.submitReview(user, id, request));
  }

  @PostMapping("/reviews/{id}/acknowledge")
  public ApiResponse<PerformanceReview> acknowledgeReview(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(performanceService.acknowledgeReview(user, id));
  }
}
