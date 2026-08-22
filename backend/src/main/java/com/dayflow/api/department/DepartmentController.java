package com.dayflow.api.department;

import com.dayflow.api.audit.AuditService;
import com.dayflow.api.common.ApiResponse;
import com.dayflow.api.security.CurrentUser;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/departments")
public class DepartmentController {
  private final DepartmentRepository departmentRepository;
  private final AuditService auditService;

  public DepartmentController(DepartmentRepository departmentRepository, AuditService auditService) {
    this.departmentRepository = departmentRepository;
    this.auditService = auditService;
  }

  @GetMapping
  @PreAuthorize("hasAnyAuthority('department:read')")
  public ApiResponse<List<Department>> list() {
    return ApiResponse.ok(departmentRepository.findAll());
  }

  @PostMapping
  @PreAuthorize("hasAuthority('department:write')")
  public ResponseEntity<ApiResponse<Department>> create(@AuthenticationPrincipal CurrentUser user,
      @jakarta.validation.Valid @RequestBody CreateDepartmentRequest request) {
    Department created = departmentRepository.create(request.name(), request.location());
    auditService.record(user.userId(), "CREATE_DEPARTMENT", "Department", String.valueOf(created.id()), null, created, null);
    return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(created));
  }

  public record CreateDepartmentRequest(@NotBlank String name, @NotBlank String location) {
  }
}
