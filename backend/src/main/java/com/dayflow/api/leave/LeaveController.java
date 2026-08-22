package com.dayflow.api.leave;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.common.PageResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leave")
public class LeaveController {
  private final LeaveService leaveService;

  public LeaveController(LeaveService leaveService) {
    this.leaveService = leaveService;
  }

  @GetMapping("/types")
  public ApiResponse<List<LeaveType>> types() {
    return ApiResponse.ok(leaveService.types());
  }

  @GetMapping("/employees/{id}/balances")
  public ApiResponse<List<LeaveBalance>> balances(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(leaveService.balancesForEmployee(user, id));
  }

  @PostMapping("/requests")
  public ResponseEntity<ApiResponse<LeaveRequest>> submit(@AuthenticationPrincipal CurrentUser user, @Valid @RequestBody SubmitLeaveRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(leaveService.submit(user, request)));
  }

  @GetMapping("/requests")
  public ApiResponse<PageResponse<LeaveRequest>> list(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String status, @RequestParam(required = false) Long employeeId,
      @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(leaveService.search(user, status, employeeId, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @PostMapping("/requests/{id}/decide")
  public ApiResponse<LeaveRequest> decide(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @Valid @RequestBody LeaveDecisionRequest request) {
    return ApiResponse.ok(leaveService.decide(user, id, request));
  }

  @PostMapping("/requests/{id}/cancel")
  public ApiResponse<LeaveRequest> cancel(@AuthenticationPrincipal CurrentUser user, @PathVariable long id, @Valid @RequestBody CancelLeaveRequest request) {
    return ApiResponse.ok(leaveService.cancel(user, id, request));
  }

  @GetMapping("/availability")
  @PreAuthorize("hasAnyAuthority('leave:read', 'leave:read:reports', 'leave:read:own')")
  public ApiResponse<List<LeaveRequest>> availability(@AuthenticationPrincipal CurrentUser user, @RequestParam(defaultValue = "7") int days) {
    return ApiResponse.ok(leaveService.teamAvailability(user, Math.min(Math.max(days, 1), 31)));
  }
}
