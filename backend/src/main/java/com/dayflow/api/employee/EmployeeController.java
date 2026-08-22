package com.dayflow.api.employee;

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
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/employees")
public class EmployeeController {
  private final EmployeeService employeeService;

  public EmployeeController(EmployeeService employeeService) {
    this.employeeService = employeeService;
  }

  @GetMapping
  public ApiResponse<PageResponse<Employee>> search(
      @AuthenticationPrincipal CurrentUser user,
      @RequestParam(required = false) String q,
      @RequestParam(required = false) Long departmentId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String employmentType,
      @RequestParam(required = false) String location,
      @RequestParam(required = false) Long managerId,
      @RequestParam(required = false) String sort,
      @RequestParam(required = false) String direction,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    int boundedSize = Math.min(Math.max(size, 1), 100);
    EmployeeRepository.SearchFilters filters = new EmployeeRepository.SearchFilters(
        q, departmentId, status, employmentType, location, managerId, sort, direction);
    return ApiResponse.ok(employeeService.search(user, filters, Math.max(page, 0), boundedSize));
  }

  @GetMapping("/org-chart")
  public ApiResponse<List<Employee>> orgChart(@AuthenticationPrincipal CurrentUser user) {
    return ApiResponse.ok(employeeService.orgChart(user));
  }

  @GetMapping("/{id}")
  public ApiResponse<Employee> getById(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(employeeService.getById(user, id));
  }

  @GetMapping("/{id}/history")
  public ApiResponse<List<EmployeeJobHistoryEntry>> history(@AuthenticationPrincipal CurrentUser user, @PathVariable long id) {
    return ApiResponse.ok(employeeService.history(user, id));
  }

  @PostMapping
  public ResponseEntity<ApiResponse<Employee>> create(@AuthenticationPrincipal CurrentUser user,
      @Valid @RequestBody CreateEmployeeRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(employeeService.create(user, request)));
  }

  @PatchMapping("/{id}")
  public ApiResponse<Employee> updateBasic(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @RequestBody BasicUpdateRequest request) {
    return ApiResponse.ok(employeeService.updateBasic(user, id, request));
  }

  @PatchMapping("/{id}/job-details")
  public ApiResponse<Employee> updateSensitive(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody SensitiveUpdateRequest request) {
    return ApiResponse.ok(employeeService.updateSensitive(user, id, request));
  }

  @PostMapping("/{id}/suspend")
  public ApiResponse<Employee> suspend(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody StatusChangeRequest request) {
    return ApiResponse.ok(employeeService.suspend(user, id, request));
  }

  @PostMapping("/{id}/reactivate")
  public ApiResponse<Employee> reactivate(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody StatusChangeRequest request) {
    return ApiResponse.ok(employeeService.reactivate(user, id, request));
  }

  @PostMapping("/{id}/archive")
  public ApiResponse<Employee> archive(@AuthenticationPrincipal CurrentUser user, @PathVariable long id,
      @Valid @RequestBody StatusChangeRequest request) {
    return ApiResponse.ok(employeeService.archive(user, id, request));
  }
}
