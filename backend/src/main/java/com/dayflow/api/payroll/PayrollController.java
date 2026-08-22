package com.dayflow.api.payroll;

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
@RequestMapping("/api/payroll")
public class PayrollController {
  private final PayrollService payrollService;

  public PayrollController(PayrollService payrollService) {
    this.payrollService = payrollService;
  }

  @GetMapping("/runs")
  public ApiResponse<PageResponse<PayrollRun>> list(@AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String status, @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    return ApiResponse.ok(payrollService.list(user, status, Math.max(page, 0), Math.min(Math.max(size, 1), 100)));
  }

  @PostMapping("/runs")
  public ResponseEntity<ApiResponse<PayrollRun>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreatePayrollRunRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(payrollService.createRun(user, request)));
  }

  @GetMapping("/runs/{id}")
  public ApiResponse<PayrollRun> get(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.get(user, id));
  }

  @GetMapping("/runs/{id}/lines")
  public ApiResponse<List<PayrollLine>> lines(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.lines(user, id));
  }

  @GetMapping("/runs/{id}/anomalies")
  public ApiResponse<List<PayrollAnomaly>> anomalies(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.anomalies(user, id));
  }

  @PostMapping("/runs/{id}/calculate")
  public ApiResponse<PayrollRun> calculate(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.calculate(user, id));
  }

  @PostMapping("/runs/{id}/submit-for-review")
  public ApiResponse<PayrollRun> submitForReview(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.submitForReview(user, id));
  }

  @PostMapping("/runs/{id}/approve")
  public ApiResponse<PayrollRun> approve(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody ApprovePayrollRequest request) {
    return ApiResponse.ok(payrollService.approve(user, id, request));
  }

  @PostMapping("/runs/{id}/publish")
  public ApiResponse<PayrollRun> publish(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.publish(user, id));
  }

  @PostMapping("/runs/{id}/mark-paid")
  public ApiResponse<PayrollRun> markPaid(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(payrollService.markPaid(user, id));
  }

  @PostMapping("/anomalies/{id}/resolve")
  public ApiResponse<PayrollAnomaly> resolveAnomaly(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody ResolveAnomalyRequest request) {
    return ApiResponse.ok(payrollService.resolveAnomaly(user, id, request));
  }

  @GetMapping("/my-slips")
  public ApiResponse<List<PayrollLine>> mySlips(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(payrollService.mySlips(user));
  }

  @GetMapping("/employees/{employeeId}/slips")
  public ApiResponse<List<PayrollLine>> slipsForEmployee(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId) {
    return ApiResponse.ok(payrollService.slipsForEmployee(user, employeeId));
  }
}
