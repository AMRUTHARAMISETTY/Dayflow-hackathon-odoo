package com.dayflow.api.payroll;

import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.employee.Employee;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employees/{employeeId}/salary")
public class SalaryController {
  private final SalaryService salaryService;

  public SalaryController(SalaryService salaryService) {
    this.salaryService = salaryService;
  }

  @GetMapping("/structures")
  public ApiResponse<List<SalaryStructure>> history(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId) {
    return ApiResponse.ok(salaryService.history(user, employeeId));
  }

  @PostMapping("/structures")
  public ApiResponse<SalaryStructure> create(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId,
      @Valid @RequestBody CreateSalaryStructureRequest request) {
    return ApiResponse.ok(salaryService.create(user, employeeId, request));
  }

  @PutMapping("/verification")
  public ApiResponse<Employee> updateVerification(@AuthenticationPrincipal CurrentUser user, @PathVariable long employeeId,
      @RequestBody VerificationFlagsRequest request) {
    return ApiResponse.ok(salaryService.updateVerificationFlags(user, employeeId, request));
  }
}
